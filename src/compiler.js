import SymbolTable from './symbol.js';
import Instruction from './instruction.js';
import ExpressionHandler from './expr.js';
import Utilities from './utilities.js';
import { MEMSIZE, HASHSIZE } from './constants.js';
import { Tokenizer } from './token.js';
import fs from 'fs';

class Compiler {
  constructor(filename) {
    this.filename = filename;
    const input = fs.readFileSync(filename, 'utf8'); // Lê o conteúdo do arquivo
    
    // Inicializa as outras partes do compilador
    this.symbolTable = new SymbolTable();
    this.tokenizer = new Tokenizer(input, this.symbolTable); // Inicializa o Tokenizer com o conteúdo do arquivo
    this.instructionHandler = new Instruction(this);
    this.exprHandler = new ExpressionHandler(this);
    this.utilities = new Utilities();

    // Propriedades principais
    this.memsize = MEMSIZE;
    this.hashtab = Array(HASHSIZE).fill(null);
    this.sml = new Array(this.memsize).fill(0);
    this.flag = new Array(this.memsize).fill(null);

    // Contadores e informações de controle
    this.inscount = 0;
    this.datacount = this.memsize - 1;
    this.ln = 1; // Linha atual do arquivo em análise
  }

  // Função para obter o próximo token
  getToken() {
    const token = this.tokenizer.getToken();
    this.ln = this.tokenizer.line; // Atualiza a linha atual no Compiler
    return token;
  }

  // Função para "devolver" um token ao analisador léxico
  ungetToken(token) {
    this.tokenizer.ungetToken(token);
  }

  // Verifica se o tipo de token é o esperado, senão gera um erro
  checkToken(expectedType, actualType) {
    if (expectedType !== actualType) {
      this.utilities.syntaxError(this, `${expectedType} esperado (recebido ${actualType})`);
    }
  }

  // Verifica se o comando é o esperado, senão gera um erro
  checkCommand(expected, actual) {
    if (expected.toUpperCase() !== actual.toUpperCase()) {
      this.utilities.syntaxError(this, `${expected} esperado (recebido ${actual})`);
    }
  }

  // Função para obter uma expressão e convertê-la em notação pós-fixa
  getExpr() {
    return this.exprHandler.getExpr();
  }

  // Função para finalizar e limpar a memória utilitiesizada pelo compilador
  cleanup() {
    this.utilities.cleanup(this);
  }
}

export default Compiler;
