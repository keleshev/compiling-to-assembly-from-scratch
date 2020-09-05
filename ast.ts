import { FunctionType } from "./types"


interface AST {
  equals(AST): boolean;
  visit<T>(v: Visitor<T>): T;
}

class Main implements AST {
  constructor(public statements: Array<AST>) {}

  visit<T>(v: Visitor<T>) { return v.visitMain(this); }

  equals(other: AST) {
    return other instanceof Main &&
      this.statements.length === other.statements.length &&
      this.statements.every((statement, i) =>
	statement.equals(other.statements[i]));
  }
}

class Assert implements AST {
  constructor(public condition: AST) {}

  visit<T>(v: Visitor<T>) { return v.visitAssert(this); }

  equals(other: AST) {
    return other instanceof Assert && 
      this.condition.equals(other.condition);
  }
}

class Integer implements AST {
  constructor(public value: number) {}

  visit<T>(v: Visitor<T>) { return v.visitInteger(this); }

  equals(other: AST) {
    return other instanceof Integer &&
      this.value === other.value;
  }
}

class Bool implements AST {
  constructor(public value: boolean) {}

  visit<T>(v: Visitor<T>) { return v.visitBool(this); }

  equals(other: AST) {
    return other instanceof Bool &&
      this.value === other.value;
  }
}

class Not implements AST {
  constructor(public term: AST) {}

  visit<T>(v: Visitor<T>) { return v.visitNot(this); }

  equals(other: AST) {
    return other instanceof Not && this.term.equals(other.term);
  }
}

class Equal implements AST {
  constructor(public left: AST, public right: AST) {}

  visit<T>(v: Visitor<T>) { return v.visitEqual(this); }

  equals(other: AST) {
    return other instanceof Equal &&
      this.left.equals(other.left) &&
      this.right.equals(other.right);
  }
}

class NotEqual implements AST {
  constructor(public left: AST, public right: AST) {}

  visit<T>(v: Visitor<T>) { return v.visitNotEqual(this); }

  equals(other: AST) {
    return other instanceof NotEqual &&
      this.left.equals(other.left) &&
      this.right.equals(other.right);
  }
}

class Add implements AST {
  constructor(public left: AST, public right: AST) {}

  visit<T>(v: Visitor<T>) { return v.visitAdd(this); }

  equals(other: AST) {
    return other instanceof Add &&
      this.left.equals(other.left) &&
      this.right.equals(other.right);
  }
}

class Subtract implements AST {
  constructor(public left: AST, public right: AST) {}

  visit<T>(v: Visitor<T>) { return v.visitSubtract(this); }

  equals(other: AST) {
    return other instanceof Subtract &&
      this.left.equals(other.left) &&
      this.right.equals(other.right);
  }
}

class Multiply implements AST {
  constructor(public left: AST, public right: AST) {}

  visit<T>(v: Visitor<T>) { return v.visitMultiply(this); }

  equals(other: AST) {
    return other instanceof Multiply &&
      this.left.equals(other.left) &&
      this.right.equals(other.right);
  }
}

class Divide implements AST {
  constructor(public left: AST, public right: AST) {}

  visit<T>(v: Visitor<T>) { return v.visitDivide(this); }

  equals(other: AST) {
    return other instanceof Divide &&
      this.left.equals(other.left) &&
      this.right.equals(other.right);
  }
}

class Call implements AST {
  constructor(public callee: string, public args: Array<AST>) {}

  visit<T>(v: Visitor<T>) { return v.visitCall(this); }

  equals(other: AST) {
    return other instanceof Call &&
      this.callee === other.callee &&
      this.args.length === other.args.length &&
      this.args.every((arg, i) => arg.equals(other.args[i]));
  }
}

class ArrayNode implements AST {
  constructor(public args: Array<AST>) {}

  visit<T>(v: Visitor<T>) { return v.visitArrayNode(this); }

  equals(other: AST) {
    return other instanceof ArrayNode &&
      this.args.length === other.args.length &&
      this.args.every((arg, i) => arg.equals(other.args[i]));
  }
}

class ArrayLookup implements AST {
  constructor(public array: AST, public index: AST) {}

  visit<T>(v: Visitor<T>) { return v.visitArrayLookup(this); }

  equals(other: AST) {
    return other instanceof ArrayLookup && 
      this.array.equals(other.array) &&
      this.index.equals(other.index);
  }
}

class Exit implements AST {
  constructor(public term: AST) {}

  visit<T>(v: Visitor<T>) { return v.visitExit(this); }

  equals(other: AST) {
    return other instanceof Exit && 
      this.term.equals(other.term);
  }
}

class Block implements AST {
  constructor(public statements: Array<AST>) {}

  visit<T>(v: Visitor<T>) { return v.visitBlock(this); }

  equals(other: AST) {
    return other instanceof Block &&
      this.statements.length === other.statements.length &&
      this.statements.every((statement, i) =>
	statement.equals(other.statements[i]));
  }
}

class If implements AST {
  constructor(public conditional: AST,
              public consequence: AST,
	      public alternative: AST) {}

  visit<T>(v: Visitor<T>) { return v.visitIf(this); }

  equals(other: AST) {
    return other instanceof If &&
      this.conditional.equals(other.conditional) &&
      this.consequence.equals(other.consequence) &&
      this.alternative.equals(other.alternative);
  }
}

class FunctionDefinition implements AST {
  constructor(public name: string,
              public signature: FunctionType,
              public body: AST) {}

  visit<T>(v: Visitor<T>) { return v.visitFunctionDefinition(this); }

  equals(other: AST) {
    return other instanceof FunctionDefinition &&
      this.name === other.name &&
      this.signature.equals(other.signature) &&
      this.body.equals(other.body);
  }
}

class Id implements AST {
  constructor(public value: string) {}

  visit<T>(v: Visitor<T>) { return v.visitId(this); }

  equals(other: AST) {
    return other instanceof Id && 
      this.value === other.value;
  }
}

class Return implements AST {
  constructor(public term: AST) {}

  visit<T>(v: Visitor<T>) { return v.visitReturn(this); }

  equals(other: AST) {
    return other instanceof Return && 
      this.term.equals(other.term);
  }
}

class While implements AST {
  constructor(public conditional: AST, public body: AST) {}

  visit<T>(v: Visitor<T>) { return v.visitWhile(this); }

  equals(other: AST) {
    return other instanceof While &&
      this.conditional.equals(other.conditional) &&
      this.body.equals(other.body);
  }
}

class Assign implements AST {
  constructor(public name: string, public value: AST) {}

  visit<T>(v: Visitor<T>) { return v.visitAssign(this); }

  equals(other: AST) {
    return other instanceof Assign &&
      this.name === other.name &&
      this.value.equals(other.value);
  }
}

class Var implements AST {
  constructor(public name: string, public value: AST) {}

  visit<T>(v: Visitor<T>) { return v.visitVar(this); }

  equals(other: AST) {
    return other instanceof Var &&
      this.name === other.name &&
      this.value.equals(other.value);
  }
}

interface Visitor<T> {
  visitMain(node: Main): T;
  visitAssert(node: Assert): T;
  visitInteger(node: Integer): T;
  visitBool(node: Bool): T;
  visitNot(node: Not): T;
  visitEqual(node: Equal): T;
  visitNotEqual(node: NotEqual): T;
  visitAdd(node: Add): T;
  visitSubtract(node: Subtract): T;
  visitMultiply(node: Multiply): T;
  visitDivide(node: Divide): T;
  visitCall(node: Call): T;
  visitArrayNode(node: ArrayNode): T;
  visitArrayLookup(node: ArrayLookup): T;
  visitExit(node: Exit): T;
  visitBlock(node: Block): T;
  visitIf(node: If): T;
  visitFunctionDefinition(node: FunctionDefinition): T;
  visitId(node: Id): T;
  visitReturn(node: Return): T;
  visitWhile(node: While): T;
  visitAssign(node: Assign): T;
  visitVar(node: Var): T;
}

export {
  AST,
  Main,
  Assert,
  Integer,
  Bool,
  Not,
  Equal,
  NotEqual,
  Add,
  Subtract,
  Multiply,
  Divide,
  Call,
  ArrayNode,
  ArrayLookup,
  Exit,
  Block,
  If,
  FunctionDefinition,
  Id,
  Return,
  While,
  Assign,
  Var,
  Visitor,
}
