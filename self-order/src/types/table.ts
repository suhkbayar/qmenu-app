export interface ITableShape {
  type: string; // 'circle' | 'rect'
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  rotation: number;
}

export interface ITableSection {
  id: string;
  name: string;
}

export interface ITable {
  id: string;
  name: string;
  code: string;
  shape?: ITableShape;
  section?: ITableSection;
}
