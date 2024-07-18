import { GetServer } from "../../Server/AllServers";
import { editor, Uri, languages } from "monaco-editor";
import { OpenScript } from "./OpenScript";
import { getFileType, FileType } from "../../utils/ScriptTransformer";

function getServerCode(scripts: OpenScript[], index: number): string | null {
  const openScript = scripts[index];
  const server = GetServer(openScript.hostname);
  if (server === null) throw new Error(`Server '${openScript.hostname}' should not be null, but it is.`);
  const data = server.getContentFile(openScript.path)?.content ?? null;
  return data;
}

function dirty(scripts: OpenScript[], index: number): string {
  const openScript = scripts[index];
  const serverData = getServerCode(scripts, index);
  if (serverData === null) return " *";
  return serverData !== openScript.code ? " *" : "";
}

function reorder(list: unknown[], startIndex: number, endIndex: number): void {
  const [removed] = list.splice(startIndex, 1);
  list.splice(endIndex, 0, removed);
}

const workers: Promise<Awaited<ReturnType<typeof languages.typescript.getJavaScriptWorker>>[]> = new Promise(
  (resolve) => {
    let count = 0;
    const callback = () => {
      if (++count == 2) {
        resolve(Promise.all([languages.typescript.getJavaScriptWorker(), languages.typescript.getTypeScriptWorker()]));
      }
    };
    languages.onLanguage("typescript", callback);
    languages.onLanguage("javascript", callback);
  },
);

function makeModel(hostname: string, filename: string, code: string) {
  const uri = Uri.from({
    scheme: "file",
    authority: hostname,
    path: filename,
  });
  let language;
  const fileType = getFileType(filename);
  switch (fileType) {
    case FileType.PLAINTEXT:
      language = "plaintext";
      break;
    case FileType.JSON:
      language = "json";
      break;
    case FileType.JS:
    case FileType.JSX:
      language = "javascript";
      break;
    case FileType.TS:
    case FileType.TSX:
      language = "typescript";
      break;
    case FileType.NS1:
      language = "javascript";
      break;
    default:
      throw new Error(`Invalid file type: ${fileType}. Filename: ${filename}.`);
  }
  //if somehow a model already exist return it
  const model = editor.getModel(uri) ?? editor.createModel(code, language, uri);
  workers.then((ws) => ws.forEach((w) => w(uri)));
  return model;
}

export { getServerCode, dirty, reorder, makeModel };
