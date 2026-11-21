import { materialIds, type MaterialId } from './materials';

interface Exhibit {
  id: string;
  title: string;
  summary: string;
  action: string;
  preview: string;
  entry: string;
  materialIds: readonly MaterialId[];
}

export const exhibits: readonly Exhibit[] = [{
  id: 'pencil',
  title: '铅笔为什么能写字？',
  summary: '看里面、找材料、写一写、擦一擦。',
  action: '探索铅笔',
  preview: './structure-explorer/pencil-preview.svg',
  entry: './structure-explorer/pencil.html',
  materialIds,
}];
