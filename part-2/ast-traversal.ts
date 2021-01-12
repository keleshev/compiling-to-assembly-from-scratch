import {
  AST, Main, Assert, Length, Number, Boolean, Undefined, Not, Equal, NotEqual,
  Add, Subtract, Multiply, Divide, Call, ArrayLiteral, ArrayLookup, Exit, Block, 
  If, Function, Id, Return, While, Assign, Var, Visitor,
} from "./ast";


class ASTTraversal implements Visitor<AST> {
  visitMain(node: Main): AST {
    let statements = node.statements.map((statement) => statement.visit(this));
    return new Main(statements);
  }

  visitAssert(node: Assert): AST {
    let condition = node.condition.visit(this);
    return new Assert(condition);
  }

  visitLength(node: Length): AST {
    let array = node.array.visit(this);
    return new Length(array);
  }

  visitNumber(node: Number): AST {
    return new Number(node.value);
  }

  visitBoolean(node: Boolean): AST {
    return new Boolean(node.value);
  }

  visitUndefined(node: Undefined): AST {
    return new Undefined();
  }

  visitNot(node: Not): AST {
    let term = node.term.visit(this);
    return new Not(term);
  }

  visitEqual(node: Equal): AST {
    let left = node.left.visit(this);
    let right = node.right.visit(this);
    return new Equal(left, right);
  }

  visitNotEqual(node: NotEqual): AST {
    let left = node.left.visit(this);
    let right = node.right.visit(this);
    return new NotEqual(left, right);
  }

  visitAdd(node: Add): AST {
    let left = node.left.visit(this);
    let right = node.right.visit(this);
    return new Add(left, right);
  }

  visitSubtract(node: Subtract): AST {
    let left = node.left.visit(this);
    let right = node.right.visit(this);
    return new Subtract(left, right);
  }

  visitMultiply(node: Multiply): AST {
    let left = node.left.visit(this);
    let right = node.right.visit(this);
    return new Multiply(left, right);
  }

  visitDivide(node: Divide): AST {
    let left = node.left.visit(this);
    let right = node.right.visit(this);
    return new Divide(left, right);
  }

  visitCall(node: Call): AST {
    let args = node.args.map((arg) => arg.visit(this));
    return new Call(node.callee, args);
  }

  visitArrayLiteral(node: ArrayLiteral): AST {
    let args = node.args.map((arg) => arg.visit(this));
    return new ArrayLiteral(args);
  }

  visitArrayLookup(node: ArrayLookup): AST {
    let array = node.array.visit(this);
    let index = node.index.visit(this);
    return new ArrayLookup(array, index);
  }

  visitExit(node: Exit): AST {
    let term = node.term.visit(this);
    return new Exit(term);
  }

  visitBlock(node: Block): AST {
    let statements = node.statements.map((statement) => statement.visit(this));
    return new Block(statements);
  }

  visitIf(node: If): AST {
    let conditional = node.conditional.visit(this);
    let consequence = node.consequence.visit(this);
    let alternative = node.alternative.visit(this);
    return new If(conditional, consequence, alternative);
  }

  visitFunction(node: Function): AST {
    let body = node.body.visit(this);
    return new Function(node.name, node.signature, body);
  }

  visitId(node: Id): AST {
    return new Id(node.value);
  }

  visitReturn(node: Return): AST {
    let term = node.term.visit(this);
    return new Return(term);
  }

  visitWhile(node: While): AST {
    let conditional = node.conditional.visit(this);
    let body = node.body.visit(this);
    return new While(conditional, body);
  }

  visitAssign(node: Assign): AST {
    let value = node.value.visit(this);
    return new Assign(node.name, value);
  }

  visitVar(node: Var): AST {
    let value = node.value.visit(this);
    return new Var(node.name, value);
  }
}

export { ASTTraversal }
