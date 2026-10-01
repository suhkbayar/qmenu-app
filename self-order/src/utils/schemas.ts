import * as yup from 'yup';

export const loginSchema = yup.object().shape({
  code: yup.string().required('Ширээний код оруулна уу'),
});
