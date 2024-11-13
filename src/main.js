import Compiler from './compiler.js';
import Util from './util.js';
import { MEMSIZE, HASHSIZE, STORE, LOAD } from './constants.js';
import fs from 'fs';

export class SimpleCompiler {
  constructor() {
    this.compiler = new Compiler(); // Instância do compilador com todos os atributos necessários
    this.outputFile = "binary.txt"; // Arquivo de saída para o código de máquina gerado
    this.doOptimize = false;
  }

  // Função de inicialização
  initialize(filename) {
    this.compiler.hashtab = new Array(HASHSIZE).fill(null);
    this.compiler.sml = new Array(MEMSIZE).fill(0);
    this.compiler.flag = new Array(MEMSIZE).fill(null);
    this.compiler.memsize = MEMSIZE;
    this.compiler.file = filename;
    this.compiler.ln = 1;
    this.compiler.inscount = 0;
    this.compiler.datacount = this.compiler.memsize - 1;
  }

  // Carrega o arquivo e converte comandos em instruções
  populate() {
    let token;
    while ((token = this.compiler.getToken()).type !== "ENDOFFILE") {
      if (token.type === "COMMENT" || token.type === "NEWLINE") continue;

      if (token.type === "LABEL") {
        if (this.compiler.symbolTable.lookupSymbol(token.value)) {
          Util.syntaxError(this.compiler, `redeclaration of ${token.value}`);
        }
        this.compiler.symbolTable.installSymbol(token.value, "label", this.compiler.inscount);
        continue;
      }

      this.compiler.checkToken("COMMAND", token.type);
      const instructionFunction = this.compiler.instruction.getInstruction(token.value);
      if (instructionFunction) {
        instructionFunction(this.compiler);
      }

      token = this.compiler.getToken();
      this.compiler.checkToken("NEWLINE", token.type);

      if (this.compiler.inscount > this.compiler.datacount) {
        Util.compileError(this.compiler, "compilation ran out of memory");
      }
    }
  }

  // Otimiza a compilação removendo instruções redundantes
  optimize() {
    for (let i = 0; i < this.compiler.inscount; i++) {
      const opcode0 = Math.floor(this.compiler.sml[i] / this.compiler.memsize);
      const operand0 = this.compiler.sml[i] % this.compiler.memsize;
      const opcode1 = Math.floor(this.compiler.sml[i + 1] / this.compiler.memsize);
      const operand1 = this.compiler.sml[i + 1] % this.compiler.memsize;
      const opcode2 = Math.floor(this.compiler.sml[i + 2] / this.compiler.memsize);

      if (operand0 === operand1 && opcode2 === STORE && opcode0 === STORE && opcode1 === LOAD) {
        for (let j = 0; j < HASHSIZE; j++) {
          for (let p = this.compiler.hashtab[j]; p !== null; p = p.next) {
            if (p.type === "label" && p.location > i) {
              p.location -= 2;
            }
          }
        }
        for (let j = i; j < this.compiler.inscount; j++) {
          this.compiler.sml[j] = this.compiler.sml[j + 2];
          this.compiler.flag[j] = this.compiler.flag[j + 2];
        }
      }
    }
  }

  // Resolve endereços de memória marcados como incompletos
  resolve() {
    for (let i = 0; i < this.compiler.memsize; i++) {
      if (this.compiler.flag[i] !== null) {
        const sym = this.compiler.symbolTable.lookupSymbol(this.compiler.flag[i]);
        if (!sym || sym.type !== "label") {
          Util.compileError(this.compiler, `failed to find label ${this.compiler.flag[i]}`);
        }
        this.compiler.sml[i] += sym.location;
      }
    }
  }

  // Escreve o código de máquina gerado no arquivo de saída
  assemble() {
    const data = this.compiler.sml.slice(0, this.compiler.memsize).map(code => `${code}`).join('\n');
    fs.writeFileSync(this.outputFile, data, 'utf8', (err) => {
      if (err) {
        Util.compileError(this.compiler, `cannot open file ${this.outputFile}`);
      }
    });
  }

  // Função de uso/ajuda para erros de execução
  usage() {
    console.error("usage: simple [-O] [-o file.sml] file.simp");
  }

  // Função principal que controla o fluxo de compilação
  main(args) {
    let i = 0;
    while (i < args.length) {
      switch (args[i]) {
        case '-O':
          this.doOptimize = true;
          break;
        case '-o':
          this.outputFile = args[++i];
          break;
        default:
          if (args[i].startsWith("-")) this.usage();
          this.filename = args[i];
      }
      i++;
    }

    if (!this.filename) this.usage();

    this.initialize(this.filename);
    this.populate();
    if (this.doOptimize) this.optimize();
    this.resolve();
    this.assemble();
    Util.cleanup(this.compiler);
  }
}

// Execução principal
