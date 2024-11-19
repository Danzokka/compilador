/* eslint-disable no-useless-escape */
/* eslint-disable no-case-declarations */
/* eslint-disable no-unused-vars */
import Compiler from './compiler.js';
import Utilities from './utilities.js';
import { MEMSIZE, HASHSIZE, STORE, LOAD } from './constants.js';
import fs from 'fs';

export class SimpleCompiler {
  constructor() {
    this.outputFile = "code/binary.txt"; // Arquivo de saída para o código de máquina gerado
    this.doOptimize = false;
    this.filename = "code/source.txt"; // Arquivo de entrada fixo
    this.compiler = new Compiler(this.filename); // Instância do compilador com todos os atributos necessários
    this.utilities = new Utilities();
  }

  //First Pass

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

  firstPassWithRegex(input) {
    const lines = input.split('\n');
    let instructionCounter = 0;

    lines.forEach(line => {
      const labelMatch = line.match(/^\s*(\d+)\s+/); // Captura o número do label
      const commandMatch = line.match(/^\s*\d+\s+([A-Za-z]+)/); // Captura o comando após o número

      if (labelMatch) {
        const label = labelMatch[1];
        // Registra o label com o endereço atual
        if (!this.compiler.symbolTable.lookupSymbol(label)) {
          this.compiler.symbolTable.installSymbol(label, "label", instructionCounter);
        }
      }

      if (commandMatch) {
        const command = commandMatch[1].toUpperCase();
        // Incrementa o contador de instruções com base no comando
        switch (command) {
          case "PRINT":
          case "INPUT":
          case "END":
          case "GOTO":
            instructionCounter += 1; // Estes geram apenas 1 instrução
            break;
          case "LET":
            // Verifica se a expressão no LET é simples ou composta
            const exprMatch = line.match(/LET\s+\w+\s*=\s*([^\n]+)/i);
            if (exprMatch) {
              const expr = exprMatch[1].trim();
              if (/^[+-]?\d+$/.test(expr)) {
                // Expressão simples como LET b = -2
                instructionCounter += 2;
              } else if (/[\+\-\*\/]/.test(expr)) {
                // Expressão composta como LET b = a + 2
                instructionCounter += 5;
              } else {
                instructionCounter += 2; // Padrão de segurança
              }
            }
            break;
          case "IF":
            // Identifica o operador relacional para determinar o número de instruções
            const relationalMatch = line.match(/(==|!=|<=|>=|<|>)/);
            if (relationalMatch) {
              const operator = relationalMatch[1];
              if (operator === "!=" || operator === "<=" || operator === ">=") {
                instructionCounter += 4; // Gera 4 instruções
              } else {
                instructionCounter += 3; // Gera 3 instruções
              }
            } else {
              console.error(`Operador relacional não encontrado no comando IF: ${line}`);
            }
            break;
          default:
            console.warn(`Comando desconhecido encontrado: ${command}`);
            break;
        }
      }
    });
  }



  // Carrega o arquivo e converte comandos em instruções
  populate() {
    let token;
    while ((token = this.compiler.getToken()).value.toUpperCase() !== "END") {
      if (token.type === "COMMENT" || token.type === "NEWLINE") continue;

      if (token.type === "LABEL") {
        if (this.compiler.symbolTable.lookupSymbol(token.value)) {
          this.utilities.syntaxError(this.compiler, `redeclaração de ${token.value}`);
        }
        this.compiler.symbolTable.installSymbol(token.value, "label", this.compiler.inscount);
        continue;
      }
      this.compiler.checkToken("COMMAND", token.type);
      const instructionFunction = this.compiler.instructionHandler.getInstruction(token.value);
      if (instructionFunction) {
        instructionFunction(this.compiler);
      }

      token = this.compiler.getToken();
      this.compiler.checkToken("NEWLINE", token.type);

      if (this.compiler.inscount > this.compiler.datacount) {
        this.utilities.compileError(this.compiler, "compilation ran out of memory");
      }
    }

    // Adiciona o comando HALT ao encontrar "END"
    const instructionFunction = this.compiler.instructionHandler.getInstruction("END");
    if (instructionFunction) {
      instructionFunction(this.compiler);
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
        const labelName = this.compiler.flag[i];
        const sym = this.compiler.symbolTable.lookupSymbol(labelName);

        if (!sym || sym.type !== "label") {
          this.utilities.compileError(this.compiler, `falha ao encontrar label ${labelName}`);
        } else {
          this.compiler.sml[i] += sym.location;
        }
      }
    }
  }

  // Escreve o código de máquina gerado no arquivo de saída
  assemble() {
    let data = this.compiler.sml.slice(0, this.compiler.memsize)
      .filter(code => code !== undefined && !isNaN(code)) // Filtrar NaN e undefined
      .map(code => {
        const codeStr = code.toString();
        return (codeStr.startsWith('+') || codeStr.startsWith('-')) ? codeStr : `+${codeStr}`;
      })
      //.filter(line => !/^\+?[01]$/.test(line)) // Filtrar linhas que são apenas +0 ou +1
      .join('\n');

    fs.writeFileSync(this.outputFile, data, 'utf8', (err) => {
      if (err) {
        this.utilities.compileError(this.compiler, `não foi possivel salvar o arquivo ${this.outputFile}`);
      }
    });
  }

  // Função principal que controla o fluxo de compilação
  main() {
    // Lê o arquivo source.txt
    try {
      const content = fs.readFileSync(this.filename, 'utf8');
      console.log(`Compilando ${this.filename}...`);
      this.initialize(this.filename);
      this.firstPassWithRegex(this.compiler.tokenizer.input);
      this.populate();
      this.assemble();
      console.log(`Compilação concluída. Código de máquina gerado em ${this.outputFile}`);
    } catch (error) {
      console.error(`Erro ao ler o arquivo ${this.filename}:`, error.message);
    } finally {
      this.utilities.cleanup(this.compiler);
    }
  }
}

// Execução principal
const simpleCompiler = new SimpleCompiler();
simpleCompiler.main();
