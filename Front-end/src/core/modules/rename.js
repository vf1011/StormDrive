import { renameFileApi } from "../api/filesapi";
import { renameFolderApi } from "../api/folderapi";

export function validateRenameName(newName, currentName) {
  const trimmed = (newName || "").trim();

  if (!trimmed) {
    return { ok: false, error: "Please enter a file name" };
  }

  if (trimmed === currentName) {
    // no change, treat as no-op
    return { ok: false, error: null, noChange: true };
  }

  const invalidChars = /[<>:"/\\|?*]/g;
  if (invalidChars.test(trimmed)) {
    return { ok: false, error: "File name contains invalid characters" };
  }

  const reservedNames = ["CON", "PRN", "AUX", "NUL"];
  const nameWithoutExt = trimmed.includes(".")
    ? trimmed.substring(0, trimmed.lastIndexOf("."))
    : trimmed;

  if (reservedNames.includes(nameWithoutExt.toUpperCase())) {
    return { ok: false, error: "This name is reserved by the system" };
  }

  return { ok: true, value: trimmed };
}

export async function renameItemOnServer({ item, newName, token }) {
  if (!item?.id || !item?.type) {
    throw new Error("Missing item id/type for rename");
  }

  if (item.type === "folder") {
    await renameFolderApi({ token, folderId: item.id, newName });
    return {
      type: "folder",
      id: item.id,
      oldName: item.name,
      newName,
    };
  } else {
    await renameFileApi({ token, fileId: item.id, newName });
    return {
      type: "file",
      id: item.id,
      oldName: item.name,
      newName,
    };
  }
}