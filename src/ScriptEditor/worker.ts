// `monaco` is available in the global scope, in the worker.

import type ts from "typescript/lib/typescript";

import { resolveScriptFilePath } from "../Paths/ScriptFilePath";
import { asFilePath } from "../Paths/FilePath";

// From https://github.com/microsoft/monaco-editor/blob/v0.50.0/src/language/typescript/tsWorker.ts#L486C1-L492C2
interface CustomTSWebWorkerFactory {
  (
    TSWorkerClass: monaco.languages.typescript.TypeScriptWorker & {
      new (): monaco.languages.typescript.TypeScriptWorker;
    },
    tsc: typeof ts,
    libs: Record<string, string>,
  ): monaco.languages.typescript.TypeScriptWorker;
}

declare global {
  var customTSWorkerFactory: CustomTSWebWorkerFactory;
}

globalThis.customTSWorkerFactory = (TSWorkerClass, tsc, libs) => {
  class CustomWorker extends TSWorkerClass implements Partial<ts.LanguageServiceHost> {
    resolveModuleNameLiterals?(
      moduleLiterals: readonly ts.StringLiteralLike[],
      containingFile: string,
      redirectedReference: ts.ResolvedProjectReference | undefined,
      options: ts.CompilerOptions,
      containingSourceFile: ts.SourceFile,
      reusedNames: readonly ts.StringLiteralLike[] | undefined,
    ): readonly ts.ResolvedModuleWithFailedLookupLocations[] {
      const containingUri = monaco.Uri.parse(containingFile);
      const containingPath = asFilePath(containingUri.path.slice(1));
      return moduleLiterals.map(({ text: path }) => {
        const resolvedPath = resolveScriptFilePath(path, containingPath, ".js");
        return {
          resolvedModule: {
            resolvedFileName: monaco.Uri.from({
              scheme: "file",
              authority: containingUri.authority,
              path: resolvedPath ?? undefined,
            }).toString(),
            extension: ".js",
          },
        };
      });
    }
  }
  return CustomWorker;
};
