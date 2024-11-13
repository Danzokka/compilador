import { HASHSIZE } from "./constants.js";

export class Utilities {

  constructor() {
  }

  syntaxError(compiler, message) {
    console.error(`${compiler.file}:${compiler.line}: error: ${message}`);
    this.cleanup(compiler);
    throw new Error("Syntax Error");
  }

  compileError(compiler, message) {
    console.error(`simple: error: ${message}`);
    this.cleanup(compiler);
    throw new Error("Compile Error");
  }

  cleanup(compiler) {
    // Libera a tabela de símbolos
    for (let i = 0; i < HASHSIZE; i++) {
      let symbol = compiler.hashtab[i];
      while (symbol !== null) {
        let temp = symbol;
        symbol = symbol.next;
        // Em JavaScript, não precisamos explicitamente liberar strings, mas definimos como null para garantir
        temp.name = null;
        temp.next = null;
      }
    }

    // Libera a memória SML
    compiler.sml = null;

    // Libera as flags pendentes
    for (let i = 0; i < compiler.memsize; i++) {
      if (compiler.flag[i] !== null) {
        compiler.flag[i] = null;
      }
    }
  }
}

export default Utilities;