"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const node_test_1 = require("node:test");
const node_path_1 = __importDefault(require("node:path"));
const typescript_1 = __importDefault(require("typescript"));
(0, node_test_1.describe)("Strict TypeScript Signatures", () => {
    function getCompileDiagnostics(sourceText) {
        const options = {
            target: typescript_1.default.ScriptTarget.ES2022,
            moduleResolution: typescript_1.default.ModuleResolutionKind.Node10,
            strict: true,
            noEmit: true,
        };
        const defaultHost = typescript_1.default.createCompilerHost(options);
        const testFileName = node_path_1.default.resolve(process.cwd(), "test-signature-check.ts");
        const customHost = {
            ...defaultHost,
            getSourceFile: (fileName, languageVersion) => {
                if (fileName === testFileName) {
                    return typescript_1.default.createSourceFile(fileName, sourceText, languageVersion);
                }
                return defaultHost.getSourceFile(fileName, languageVersion);
            },
            fileExists: (fileName) => fileName === testFileName || defaultHost.fileExists(fileName),
            readFile: (fileName) => (fileName === testFileName ? sourceText : defaultHost.readFile(fileName)),
        };
        const program = typescript_1.default.createProgram([testFileName], options, customHost);
        const sourceFile = program.getSourceFile(testFileName);
        if (!sourceFile) {
            return ["Source file not found"];
        }
        const diags = program.getSemanticDiagnostics(sourceFile);
        return diags.map((d) => typescript_1.default.flattenDiagnosticMessageText(d.messageText, "\n"));
    }
    (0, node_test_1.it)("compiles standard Pino signatures without errors", () => {
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
        chai_1.assert.deepEqual(diags, [], "Expected valid Pino signatures to compile cleanly with 0 diagnostics");
    });
    (0, node_test_1.it)("fails compilation when legacy Winston inverted call (msg, obj) is used", () => {
        const invalidSnippet = `
      import { StrictLogger } from "./src/logger-types";
      declare const log: StrictLogger;

      // Legacy Winston call: string first followed by object
      log.info("user login", { userId: "user-123" });
    `;
        const diags = getCompileDiagnostics(invalidSnippet);
        chai_1.assert.isAbove(diags.length, 0, "Expected compilation to fail for inverted call");
        chai_1.assert.match(diags.join("\n"), /not assignable to parameter of type 'never'/, "Expected error to indicate second argument is not assignable to 'never'");
    });
    (0, node_test_1.it)("fails compilation when legacy inverted error call (msg, Error) is used", () => {
        const invalidSnippet = `
      import { StrictLogger } from "./src/logger-types";
      declare const log: StrictLogger;

      // Legacy inverted call: message first, Error object second
      log.error("something failed", new Error("disk full"));
    `;
        const diags = getCompileDiagnostics(invalidSnippet);
        chai_1.assert.isAbove(diags.length, 0, "Expected compilation to fail for inverted error call");
        chai_1.assert.match(diags.join("\n"), /not assignable to parameter of type 'never'/, "Expected error to indicate Error argument is not assignable to 'never'");
    });
});
//# sourceMappingURL=signature.js.map