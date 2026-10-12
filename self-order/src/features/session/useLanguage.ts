import { useCallback, useMemo, useState } from 'react';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { UPDATE_PROFILE } from '@/src/graphql/mutations/register';
import { GET_BRANCH, ME } from '@/src/graphql/queries';
import { setStorage } from '@/src/lib/storage';
import { useSessionStore } from './sessionStore';

/** Every language the app has translations for, named in its own script. Their flags are in ui/Flag. */
export const LANGUAGES = [
  { code: 'mn', label: 'Монгол' },
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'sv', label: 'Svenska' },
  { code: 'uz', label: "O'zbek" },
];

/**
 * The guest's language. Changing it saves it on the tablet and the profile, then reloads the
 * menu so dish names come back translated.
 */
export const useLanguage = () => {
  const { i18n } = useTranslation();
  const branchLanguages = useSessionStore((s) => s.participant?.branch?.languages);
  const participantId = useSessionStore((s) => s.participant?.id);
  const setParticipant = useSessionStore((s) => s.setParticipant);
  const [changing, setChanging] = useState(false);

  // A language saved on the profile wins over the tablet's default
  const { data: profile } = useQuery(ME, {
    onCompleted(data) {
      const saved = data?.me?.language?.toLowerCase();
      if (saved && i18n.language !== saved) i18n.changeLanguage(saved);
    },
  });

  const [getBranch] = useLazyQuery(GET_BRANCH, { fetchPolicy: 'network-only' });
  const [updateProfile] = useMutation(UPDATE_PROFILE, {
    update(cache, { data: { updateProfile } }) {
      const cached = cache.readQuery<{ me: any }>({ query: ME });
      if (cached?.me?.id === updateProfile.id) cache.writeQuery({ query: ME, data: { me: updateProfile } });
    },
  });

  // Only the languages the restaurant turned on (all of them when it set none)
  const languages = useMemo(() => {
    const allowed = branchLanguages?.map((l: string) => l.toLowerCase()) ?? [];
    return allowed.length ? LANGUAGES.filter((l) => allowed.includes(l.code)) : LANGUAGES;
  }, [branchLanguages]);

  const current = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  const change = useCallback(
    async (code: string) => {
      setChanging(true);
      try {
        await i18n.changeLanguage(code);
        await setStorage('language', code);
        const me = profile?.me;
        await updateProfile({
          variables: {
            input: {
              firstName: me?.firstName,
              lastName: me?.lastName,
              gender: me?.gender,
              birthday: null,
              email: me?.email || null,
              language: code.toUpperCase(),
            },
          },
        });
        if (participantId) {
          const { data } = await getBranch({ variables: { id: participantId } });
          if (data?.getParticipant) setParticipant(data.getParticipant);
        }
      } catch {
        // The interface language already changed; dish names follow on the next menu refresh
      } finally {
        setChanging(false);
      }
    },
    [i18n, profile, updateProfile, participantId, getBranch, setParticipant],
  );

  return { languages, current, change, changing };
};
