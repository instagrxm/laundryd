export interface Settings {
  id: string;
  title: string;
  schedule?: string;
  subscribe: string[];
  begin?: number;
  retain?: number;
  [key: string]: any;
}
