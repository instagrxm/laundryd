export interface Settings {
  id: string;
  name: string;
  schedule?: string;
  subscribe: string[];
  begin?: number;
  retain?: number;
  [key: string]: any;
}
