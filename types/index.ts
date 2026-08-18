export type Tag = {
  id: string;
  name: string;
};

export type Link = {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  memo: string | null;
  folder_id: string | null;
  is_favorite: boolean;
  is_read: boolean;
  is_broken: boolean;
  click_count: number;
  created_at: string;
  updated_at: string;
  tags: { tag: Tag }[];
};

export type Folder = {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
};

export type FolderNode = Folder & { children: FolderNode[] };
