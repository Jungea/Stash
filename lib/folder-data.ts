import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function getFoldersWithCounts(supabase: SupabaseServerClient) {
  const { data: folders, error: foldersError } = await supabase
    .from("folders")
    .select("*")
    .order("order", { ascending: true })
    .order("created_at", { ascending: true });

  if (foldersError) throw foldersError;

  const { data: links, error: linksError } = await supabase
    .from("links")
    .select("folder_id")
    .not("folder_id", "is", null);

  if (linksError) throw linksError;

  const linkCounts = new Map<string, number>();
  for (const link of links ?? []) {
    if (link.folder_id) {
      linkCounts.set(link.folder_id, (linkCounts.get(link.folder_id) ?? 0) + 1);
    }
  }

  const childrenByParent = new Map<string, string[]>();
  for (const folder of folders ?? []) {
    if (!folder.parent_id) continue;
    const children = childrenByParent.get(folder.parent_id) ?? [];
    children.push(folder.id);
    childrenByParent.set(folder.parent_id, children);
  }

  const totalCounts = new Map<string, number>();
  function countFolder(folderId: string, visiting = new Set<string>()): number {
    const cached = totalCounts.get(folderId);
    if (cached !== undefined) return cached;
    if (visiting.has(folderId)) return linkCounts.get(folderId) ?? 0;

    const nextVisiting = new Set(visiting);
    nextVisiting.add(folderId);
    const childCount = (childrenByParent.get(folderId) ?? []).reduce(
      (total, childId) => total + countFolder(childId, nextVisiting),
      0
    );
    const total = (linkCounts.get(folderId) ?? 0) + childCount;
    totalCounts.set(folderId, total);
    return total;
  }

  return (folders ?? []).map((folder) => ({
    ...folder,
    links: [{ count: countFolder(folder.id) }],
  }));
}
