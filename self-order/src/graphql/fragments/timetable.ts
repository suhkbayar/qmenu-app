import { gql } from '@apollo/client';

export const TIMETABLE_FIELDS = gql`
  fragment TimeTableFields on TimeTable {
    mon
    monOpen
    monClose
    tue
    tueOpen
    tueClose
    wed
    wedOpen
    wedClose
    thu
    thuOpen
    thuClose
    fri
    friOpen
    friClose
    sat
    satOpen
    satClose
    sun
    sunOpen
    sunClose
  }
`;
