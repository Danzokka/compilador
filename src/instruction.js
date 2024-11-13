// Constantes para operações (equivalentes aos opcodes em C)
import { MEMSIZE, LOAD, STORE, ADD, SUBTRACT, MULTIPLY, DIVIDE, MODULE, BRANCH, BRANCHNEG, BRANCHZERO, HALT, READ, WRITE } from './constants.js';

export class Instruction {
  constructor(compiler) {
    this.compiler = compiler;
  }

  getInstruction(command) {
    //console.log('Command:', command)
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

      let sym = compiler.symbolTable.lookupSymbol(tok.value) ||
        compiler.symbolTable.installSymbol(tok.value, "variable", compiler.datacount--);

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

      const sym = compiler.symbolTable.lookupSymbol(tok.value);
      if (!sym) compiler.syntaxError(`'${tok.value}' undeclared`);

      compiler.sml[compiler.inscount++] = WRITE * MEMSIZE + sym.location;
    } while ((tok = compiler.getToken()).type === "COMMA");

    compiler.ungetToken(tok);
  }

  // Gera instruções para o comando GOTO
  commandGoto() {
    const { compiler } = this;
    let tok = compiler.getToken();
    if (tok.type !== "VARIABLE" && tok.type !== "CONSTANT") {
      compiler.syntaxError(`Expected VARIABLE or CONSTANT after GOTO, but got ${tok.type}`);
    }

    let sym = compiler.symbolTable.lookupSymbol(tok.value);
    let labelAddress = sym ? sym.location : 0;

    if (!sym) compiler.flag[compiler.inscount] = tok.value;

    compiler.sml[compiler.inscount++] = BRANCH * MEMSIZE + labelAddress;
  }

  // Gera instruções para o comando IF
  // Gera instruções para o comando IF
  commandIf() {
    const { compiler } = this;

    // Obtém a primeira expressão
    const expr1 = compiler.getExpr();
    //console.log('expr1 if:', expr1);
    const op1 = this.evaluateExpr(expr1);

    // Verifica o operador relacional
    const relop = compiler.getToken();
    //console.log('Relational Operator:', relop);  // Log do operador relacional para depuração
    compiler.checkToken("RELATIONAL", relop.type);

    // Obtém a segunda expressão
    const expr2 = compiler.getExpr();
    //console.log('expr2 if:', expr2);
    const op2 = this.evaluateExpr(expr2);

    // Em seguida, espera "GOTO" como comando
    let tok = compiler.getToken();
    if (tok.type === "COMMAND") tok.type = "GOTOKEYWRD";
    compiler.checkToken("GOTOKEYWRD", tok.type);
    compiler.checkCommand("GOTO", tok.value);

    // Obtém o rótulo da variável que é o destino do GOTO
    tok = compiler.getToken();
    if (tok.type !== "VARIABLE" && tok.type !== "CONSTANT") {
      compiler.syntaxError(`Expected VARIABLE or CONSTANT after GOTO, but got ${tok.type}`);
    }

    const sym = compiler.symbolTable.lookupSymbol(tok.value);
    const labelAddress = sym ? sym.location : 0;
    if (!sym) compiler.flag[compiler.inscount] = tok.value;

    // Gera as instruções de desvio
    this.generateBranchInstructions(op1, op2, relop.value, labelAddress);
  }

  // Gera instruções de branch com base na operação relacional
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

  // Gera instruções para o comando END
  commandEnd() {
    this.compiler.sml[this.compiler.inscount++] = HALT * MEMSIZE;
  }

  evaluateExpr(expr) {
    const { compiler } = this;
    const stack = [];

    expr.forEach((p) => {
      if (p.type === "num") {
        compiler.sml[compiler.datacount] = p.value;
        stack.push(compiler.datacount--);
      } else if (p.type === "symb") {
        const sym = compiler.symbolTable.lookupSymbol(p.value);
        if (!sym) compiler.syntaxError(`'${p.value}' undeclared`);
        stack.push(sym.location);
      } else {
        const op2 = stack.pop();
        const op1 = stack.pop();
        compiler.sml[compiler.inscount++] = LOAD * MEMSIZE + op1;
        switch (p.value) {
          case "+": compiler.sml[compiler.inscount++] = ADD * MEMSIZE + op2; break;
          case "-": compiler.sml[compiler.inscount++] = SUBTRACT * MEMSIZE + op2; break;
          case "*": compiler.sml[compiler.inscount++] = MULTIPLY * MEMSIZE + op2; break;
          case "/": compiler.sml[compiler.inscount++] = DIVIDE * MEMSIZE + op2; break;
          case "%": compiler.sml[compiler.inscount++] = MODULE * MEMSIZE + op2; break;
        }
        compiler.sml[compiler.inscount++] = STORE * MEMSIZE + compiler.datacount;
        stack.push(compiler.datacount--);
      }
    });

    return stack.pop();
  }
}

export default Instruction;