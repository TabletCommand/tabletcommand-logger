import { assert } from "chai";
import { describe, it } from "node:test";
import path from "node:path";
import ts from "typescript";

describe("Strict TypeScript Signatures", () => {
  function getCompileDiagnostics(sourceText: string): string[] {
    const options: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      strict: true,
      noEmit: true,
    };
    const defaultHost = ts.createCompilerHost(options);
    const testFileName = path.resolve(process.cwd(), "test-signature-check.ts");

    const customHost: ts.CompilerHost = {
      ...defaultHost,
      getSourceFile: (fileName, languageVersion) => {
        if (fileName === testFileName) {
          return ts.createSourceFile(fileName, sourceText, languageVersion);
        }
        return defaultHost.getSourceFile(fileName, languageVersion);
      },
      fileExists: (fileName) => fileName === testFileName || defaultHost.fileExists(fileName),
      readFile: (fileName) => (fileName === testFileName ? sourceText : defaultHost.readFile(fileName)),
    };

    const program = ts.createProgram([testFileName], options, customHost);
    const sourceFile = program.getSourceFile(testFileName);
    if (!sourceFile) {
      return ["Source file not found"];
    }
    const diags = program.getSemanticDiagnostics(sourceFile);
    return diags.map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"));
  }

  it("compiles standard Pino signatures without errors", () => {
    const validSnippet = `
      import { StrictLogger } from "./src/logger-types";
      declare const log: StrictLogger;

      // Pino convention 1: string message only
      log.info("hello world");
      log.info("user %s count %d", "john", 42);

      // Pino convention 2: object first, optional message
      log.info({ userId: "user-123" }, "user login");
      log.info({ userId: "user-123" });

      // Errors
      log.error(new Error("network failure"), "failed to reach remote");
      log.error(new Error("network failure"));
      log.warn({ warning: true }, "alert message");
      log.debug({ debugData: 123 });
    `;

    const diags = getCompileDiagnostics(validSnippet);
    assert.deepEqual(diags, [], "Expected valid Pino signatures to compile cleanly with 0 diagnostics");
  });

  it("fails compilation when legacy Winston inverted call (msg, obj) is used", () => {
    const invalidSnippet = `
      import { StrictLogger } from "./src/logger-types";
      declare const log: StrictLogger;

      // Legacy Winston call: string first followed by object
      log.info("user login", { userId: "user-123" });
    `;

    const diags = getCompileDiagnostics(invalidSnippet);
    assert.isAbove(diags.length, 0, "Expected compilation to fail for inverted call");
    assert.match(
      diags.join("\n"),
      /not assignable to parameter of type 'never'/,
      "Expected error to indicate second argument is not assignable to 'never'"
    );
  });

  it("fails compilation when legacy inverted error call (msg, Error) is used", () => {
    const invalidSnippet = `
      import { StrictLogger } from "./src/logger-types";
      declare const log: StrictLogger;

      // Legacy inverted call: message first, Error object second
      log.error("something failed", new Error("disk full"));
    `;

    const diags = getCompileDiagnostics(invalidSnippet);
    assert.isAbove(diags.length, 0, "Expected compilation to fail for inverted error call");
    assert.match(
      diags.join("\n"),
      /not assignable to parameter of type 'never'/,
      "Expected error to indicate Error argument is not assignable to 'never'"
    );
  });
});
