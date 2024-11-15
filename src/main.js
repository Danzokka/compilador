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
      const match = line.match(/^\s*(\d+)\s+/);  // Captura o primeiro número seguido de espaço
      if (match) {
        const label = match[1];
        // Se o label ainda não foi registrado, adiciona com o endereço atual
        if (!this.compiler.symbolTable.lookupSymbol(label)) {
          console.log(`Registrando label ${label} no endereço ${instructionCounter}`);
          this.compiler.symbolTable.installSymbol(label, "label", instructionCounter);
        }
      }
      // Incrementa o contador de instruções para cada linha processada
      instructionCounter++;
    });
  }

  // Carrega o arquivo e converte comandos em instruções
  populate() {
    let token
    while ((token = this.compiler.getToken()).value.toUpperCase() !== "END") {
      //console.log('Populate:', token)
      if (token.type === "COMMENT" || token.type === "NEWLINE") continue;

      if (token.type === "LABEL") {
        if (this.compiler.symbolTable.lookupSymbol(token.value)) {
          this.utilities.syntaxError(this.compiler, `redeclaration of ${token.value}`);
        }
        this.compiler.symbolTable.installSymbol(token.value, "label", this.compiler.inscount);
        continue;
      }
      this.compiler.checkToken("COMMAND", token.type);
      const instructionFunction = this.compiler.instructionHandler.getInstruction(token.value);
      if (instructionFunction) {
        //console.log('Entrando')
        instructionFunction(this.compiler);
        //console.log('Saiu')
      }

      token = this.compiler.getToken();
      //console.log('Populate:', token)
      this.compiler.checkToken("NEWLINE", token.type);

      //console.log('Inscount:', this.compiler.inscount)
      //console.log('Datacount:', this.compiler.datacount)
      if (this.compiler.inscount > this.compiler.datacount) {
        this.utilities.compileError(this.compiler, "compilation ran out of memory");
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
    console.log("Iniciando resolução de rótulos...");
    for (let i = 0; i < this.compiler.memsize; i++) {
      console.log(`Verificando flags ${this.compiler.flag}`);
      if (this.compiler.flag[i] !== null) {
        const labelName = this.compiler.flag[i];
        const sym = this.compiler.symbolTable.lookupSymbol(labelName);

        console.log(`Resolving label '${labelName}' at position ${i}`);
        if (!sym || sym.type !== "label") {
          this.utilities.compileError(this.compiler, `failed to find label ${labelName}`);
        } else {
          console.log(`Label '${labelName}' found at location ${sym.location}`);
          this.compiler.sml[i] += sym.location;
        }
      }
    }
    console.log("Resolução de rótulos concluída.");
  }

  // Escreve o código de máquina gerado no arquivo de saída
  assemble() {
    let data = this.compiler.sml.slice(0, this.compiler.memsize)
      .filter(code => code !== undefined && !isNaN(code)) // Filtrar NaN e undefined
      .map(code => `+${code}`)
      .filter(line => !/^\+?[01]$/.test(line)) // Filtrar linhas que são apenas +0 ou +1
      .join('\n');

    fs.writeFileSync(this.outputFile, data, 'utf8', (err) => {
      if (err) {
        this.utilities.compileError(this.compiler, `cannot open file ${this.outputFile}`);
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
      console.log(`Arquivo ${this.filename} lido com sucesso.`);
      console.log(`Iniciando primeira passagem...`);
      this.firstPassWithRegex(this.compiler.tokenizer.input);
      console.log(`Iniciando população...`);
      this.populate();
      console.log(`População concluída.`);
      //if (this.doOptimize) this.optimize();
      //console.log(`Iniciando resolução de endereços...`);
      //this.resolve();
      //console.log(`Resolução de endereços concluída.`);
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
