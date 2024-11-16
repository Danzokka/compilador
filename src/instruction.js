// Constantes para operações (equivalentes aos opcodes em C)
import { MEMSIZE, LOAD, STORE, ADD, SUBTRACT, MULTIPLY, DIVIDE, MODULE, BRANCH, BRANCHNEG, BRANCHZERO, HALT, READ, WRITE } from './constants.js';

export class Instruction {
  constructor(compiler) {
    this.compiler = compiler;
  }

  getInstruction(command) {
    switch (command.toUpperCase()) {
      case "INPUT": return this.commandInput.bind(this);
      case "PRINT": return this.commandPrint.bind(this);
      case "LET": return this.commandLet.bind(this);
      case "GOTO": return this.commandGoto.bind(this);
      case "IF": return this.commandIf.bind(this);
      case "END": return this.commandEnd.bind(this);
      default: return null;
    }
  }

  // Gera instruções para o comando LET
  commandLet() {
    const { compiler } = this;
    let tok = compiler.getToken();
    compiler.checkToken("VARIABLE", tok.type);

    let sym = compiler.symbolTable.lookupSymbol(tok.value) ||
      compiler.symbolTable.installSymbol(tok.value, "variable", compiler.datacount--);

    let varLocation = sym.location;

    tok = compiler.getToken();
    compiler.checkToken("ASSIGNMENT", tok.type);

    const expr = compiler.getExpr();
    const resultLocation = this.evaluateExpr(expr);

    compiler.sml[compiler.inscount++] = LOAD * MEMSIZE + resultLocation;
    compiler.sml[compiler.inscount++] = STORE * MEMSIZE + varLocation;
  }

  // Gera instruções para o comando INPUT
  commandInput() {
    const { compiler } = this;
    let tok;
    do {
      tok = compiler.getToken();
      compiler.checkToken("VARIABLE", tok.type);

      let sym = compiler.symbolTable.lookupSymbol(tok.value);
      if (!sym) {
        // Se a variável não existe, cria um novo símbolo
        sym = compiler.symbolTable.installSymbol(tok.value, "variable", compiler.datacount--);
      }
      compiler.sml[compiler.inscount++] = READ * MEMSIZE + sym.location;
    } while ((tok = compiler.getToken()).type === "COMMA");

    compiler.ungetToken(tok);
  }

  // Gera instruções para o comando PRINT
  commandPrint() {
    const { compiler } = this;
    let tok;
    do {
      tok = compiler.getToken();
      compiler.checkToken("VARIABLE", tok.type);

      let sym = compiler.symbolTable.lookupSymbol(tok.value);
      if (!sym) {
        compiler.syntaxError(`'${tok.value}' não declarado`);
      }

      compiler.sml[compiler.inscount++] = WRITE * MEMSIZE + sym.location;
    } while ((tok = compiler.getToken()).type === "COMMA");

    compiler.ungetToken(tok);
  }

  // Gera instruções para o comando GOTO
  commandGoto() {
    const { compiler } = this;
    let tok = compiler.getToken();
    if (tok.type !== "VARIABLE" && tok.type !== "CONSTANT") {
      compiler.syntaxError(`Esperado VARIABLE ou CONSTANT após GOTO, recebido ${tok.type}`);
    }

    let sym = compiler.symbolTable.lookupSymbol(tok.value);
    let labelAddress = sym ? sym.location : 0;

    if (!sym) compiler.flag[compiler.inscount] = tok.value;

    compiler.sml[compiler.inscount++] = BRANCH * MEMSIZE + labelAddress;
  }

  // Gera instruções para o comando IF
  commandIf() {
    const { compiler } = this;

    const expr1 = compiler.getExpr();
    const op1 = this.evaluateExpr(expr1);

    const relop = compiler.getToken();
    compiler.checkToken("RELATIONAL", relop.type);

    const expr2 = compiler.getExpr();
    const op2 = this.evaluateExpr(expr2);

    let tok = compiler.getToken();
    if (tok.type === "COMMAND") tok.type = "GOTOKEYWRD";
    compiler.checkToken("GOTOKEYWRD", tok.type);
    compiler.checkCommand("GOTO", tok.value);

    tok = compiler.getToken();
    if (tok.type !== "VARIABLE" && tok.type !== "CONSTANT") {
      compiler.syntaxError(`Esperado VARIABLE ou CONSTANT após GOTO, recebido ${tok.type}`);
    }

    const sym = compiler.symbolTable.lookupSymbol(tok.value);
    const labelAddress = sym ? sym.location : 0;
    if (!sym) compiler.flag[compiler.inscount] = tok.value;

    this.generateBranchInstructions(op1, op2, relop.value, labelAddress);
  }

  generateBranchInstructions(op1, op2, relop, labelAddress) {
    const { compiler } = this;
    switch (relop) {
      case "==":
        compiler.sml[compiler.inscount++] = LOAD * MEMSIZE + op1;
        compiler.sml[compiler.inscount++] = SUBTRACT * MEMSIZE + op2;
        compiler.sml[compiler.inscount++] = BRANCHZERO * MEMSIZE + labelAddress;
        break;
      case "!=":
        compiler.sml[compiler.inscount++] = LOAD * MEMSIZE + op1;
        compiler.sml[compiler.inscount++] = SUBTRACT * MEMSIZE + op2;
        compiler.sml[compiler.inscount++] = BRANCHZERO * MEMSIZE + 2;
        compiler.sml[compiler.inscount++] = BRANCH * MEMSIZE + labelAddress;
        break;
      case "<":
        compiler.sml[compiler.inscount++] = LOAD * MEMSIZE + op1;
        compiler.sml[compiler.inscount++] = SUBTRACT * MEMSIZE + op2;
        compiler.sml[compiler.inscount++] = BRANCHNEG * MEMSIZE + labelAddress;
        break;
      case ">":
        compiler.sml[compiler.inscount++] = LOAD * MEMSIZE + op2;
        compiler.sml[compiler.inscount++] = SUBTRACT * MEMSIZE + op1;
        compiler.sml[compiler.inscount++] = BRANCHNEG * MEMSIZE + labelAddress;
        break;
      case "<=":
        compiler.sml[compiler.inscount++] = LOAD * MEMSIZE + op1;
        compiler.sml[compiler.inscount++] = SUBTRACT * MEMSIZE + op2;
        compiler.sml[compiler.inscount++] = BRANCHNEG * MEMSIZE + labelAddress;
        compiler.sml[compiler.inscount++] = BRANCHZERO * MEMSIZE + labelAddress;
        break;
      case ">=":
        compiler.sml[compiler.inscount++] = LOAD * MEMSIZE + op2;
        compiler.sml[compiler.inscount++] = SUBTRACT * MEMSIZE + op1;
        compiler.sml[compiler.inscount++] = BRANCHNEG * MEMSIZE + labelAddress;
        compiler.sml[compiler.inscount++] = BRANCHZERO * MEMSIZE + labelAddress;
        break;
    }
  }

  commandEnd() {
    this.compiler.sml[this.compiler.inscount++] = HALT * MEMSIZE;
  }

  evaluateExpr(expr) {
    const { compiler } = this;
    const stack = [];

    for (let i = 0; i < expr.length; i++) {
      const current = expr[i];

      if (current.type === "num") {
        // Verifica se o número é precedido por um operador "-" para torná-lo negativo
        if (
          (i === 0 || expr[i - 1].type === "op") && // Está no início ou após um operador
          (i + 1 < expr.length && expr[i + 1].type === "op" && expr[i + 1].value === "-" && expr[i + 1].next == null)
        ) {
          const value = -Math.abs(parseInt(current.value, 10)); // Converte para negativo
          compiler.sml[compiler.datacount] = value; // Salva o valor na memória
          stack.push(compiler.datacount--);
          i++; // Pula o operador "-" já processado
        } else {
          const value = parseInt(current.value, 10);
          compiler.sml[compiler.datacount] = value; // Salva o valor na memória
          stack.push(compiler.datacount--);
        }
      } else if (current.type === "symb") {
        // Verifica se é uma variável precedida por um operador "-"
        if (
          (i === 0 || expr[i - 1].type === "op") && // Está no início ou após um operador
          (i + 1 < expr.length && expr[i + 1].type === "op" && expr[i + 1].value === "-" && expr[i + 1].next == null)
        ) {
          const sym = compiler.symbolTable.lookupSymbol(current.value);
          if (!sym) compiler.syntaxError(`'${current.value}' não declarado`);
          const location = sym.location;
          compiler.sml[compiler.inscount++] = LOAD * MEMSIZE + location;
          compiler.sml[compiler.inscount++] = SUBTRACT * MEMSIZE + location; // Faz o valor negativo
          compiler.sml[compiler.inscount++] = STORE * MEMSIZE + compiler.datacount;
          stack.push(compiler.datacount--);
          i++; // Pula o operador "-" já processado
        } else {
          const sym = compiler.symbolTable.lookupSymbol(current.value);
          if (!sym) compiler.syntaxError(`'${current.value}' não declarado`);
          stack.push(sym.location);
        }
      } else if (current.type === "op") {
        // Trata operadores (caso geral)
        const op2 = stack.pop();
        const op1 = stack.pop();
        compiler.sml[compiler.inscount++] = LOAD * MEMSIZE + op1;
        switch (current.value) {
          case "+":
            compiler.sml[compiler.inscount++] = ADD * MEMSIZE + op2;
            break;
          case "-":
            compiler.sml[compiler.inscount++] = SUBTRACT * MEMSIZE + op2;
            break;
          case "*":
            compiler.sml[compiler.inscount++] = MULTIPLY * MEMSIZE + op2;
            break;
          case "/":
            compiler.sml[compiler.inscount++] = DIVIDE * MEMSIZE + op2;
            break;
          case "%":
            compiler.sml[compiler.inscount++] = MODULE * MEMSIZE + op2;
            break;
        }
        compiler.sml[compiler.inscount++] = STORE * MEMSIZE + compiler.datacount;
        stack.push(compiler.datacount--);
      }
    }

    return stack.pop();
  }


}

export default Instruction;
