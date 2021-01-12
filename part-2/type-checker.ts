import { 
  Type, BooleanType, NumberType, VoidType, ArrayType, FunctionType,
} from "./types";

import {
  AST, Main, Assert, Length, Number, Boolean, Undefined, Not, Equal, NotEqual,
  Add, Subtract, Multiply, Divide, Call, ArrayLiteral, ArrayLookup, Exit, Block, If,
  Function, Id, Return, While, Assign, Var, Visitor,
} from "./ast";


function assertType(expected: Type, got: Type): void {
  if (!expected.equals(got)) {
    throw Error(`Type error: expected ${expected}, but got ${got}`);
  }
}

class TypeChecker implements Visitor<Type> {
  constructor(public locals: Map<string, Type> = new Map(),
              public functions: Map<string, FunctionType> = new Map(),
              public currentFunctionReturnType: Type | null = null) {}

  visitMain(node: Main) {
    node.statements.forEach((statement) => statement.visit(this));
    return new VoidType();
  }

  visitAssert(node: Assert) {
    assertType(new BooleanType(), node.condition.visit(this));
    return new VoidType();
  }

  visitLength(node: Length) {
    let type = node.array.visit(this);
    if (type instanceof ArrayType) {
      return new NumberType();
    } else {
      throw Error(`Type error: expected an array, but got ${type}`);
    }
  }

  visitNumber(node: Number) {
    return new NumberType();
  }

  visitBoolean(node: Boolean) {
    return new BooleanType();
  }

  visitUndefined(node: Undefined) {
    return new VoidType();
  }

  visitNot(node: Not) {
    assertType(new BooleanType(), node.term.visit(this));
    return new BooleanType();
  }

  visitEqual(node: Equal) {
    let leftType = node.left.visit(this);
    let rightType = node.right.visit(this);
    assertType(leftType, rightType);
    return new BooleanType();
  }

  visitNotEqual(node: NotEqual) {
    let leftType = node.left.visit(this);
    let rightType = node.right.visit(this);
    assertType(leftType, rightType);
    return new BooleanType();
  }

  visitAdd(node: Add) {
    assertType(new NumberType(), node.left.visit(this));
    assertType(new NumberType(), node.right.visit(this));
    return new NumberType();
  }

  visitSubtract(node: Subtract) {
    assertType(new NumberType(), node.left.visit(this));
    assertType(new NumberType(), node.right.visit(this));
    return new NumberType();
  }

  visitMultiply(node: Multiply) {
    assertType(new NumberType(), node.left.visit(this));
    assertType(new NumberType(), node.right.visit(this));
    return new NumberType();
  }

  visitDivide(node: Divide) {
    assertType(new NumberType(), node.left.visit(this));
    assertType(new NumberType(), node.right.visit(this));
    return new NumberType();
  }

  visitCall(node: Call) {
    let expected = this.functions.get(node.callee);
    if (!expected) {
      throw TypeError(`Function ${node.callee} is not defined`); 
    }
    let argsTypes = new Map();
    node.args.forEach((arg, i) => argsTypes.set(`x${i}`, arg.visit(this)));
    let got = new FunctionType(argsTypes, expected.returnType);
    assertType(expected, got);
    return expected.returnType;
  }

  visitArrayLiteral(node: ArrayLiteral): Type {
    if (node.args.length == 0) {
      throw TypeError("Can't infer type of an empty array");
    }
    let argsTypes = node.args.map((arg) => arg.visit(this));
    // Assert all arguments have the same type, pairwise
    let elementType = argsTypes.reduce((prev, next) => {
      assertType(prev, next);
      return prev;
    });
    return new ArrayType(elementType);
  }

  visitArrayLookup(node: ArrayLookup): Type {
    assertType(new NumberType(), node.index.visit(this));
    let type = node.array.visit(this);
    if (type instanceof ArrayType) {
      return type.element;
    } else {
      throw TypeError(`Expected an array, but got ${type}`);
    }
  }

  visitExit(node: Exit) {
    assertType(new NumberType(), node.term.visit(this));
    return new VoidType();
  }

  visitBlock(node: Block) {
    node.statements.forEach((statement) => statement.visit(this));
    return new VoidType();
  }

  visitIf(node: If) {
    node.conditional.visit(this);
    node.consequence.visit(this);
    node.alternative.visit(this);
    return new VoidType();
  }

  visitFunction(node: Function) {
    if (this.currentFunctionReturnType) {
      throw Error("Nexted functions are not supported");
    }
    this.functions.set(node.name, node.signature);
    let visitor = new TypeChecker( 
      new Map(node.signature.parameters),
      this.functions,
      node.signature.returnType,
    );
    node.body.visit(visitor);
    return new VoidType();
  }

  visitId(node: Id) {
    let type = this.locals.get(node.value);
    if (!type) {
      throw TypeError(`Undefined variable ${node.value}`);
    }
    return type;
  }

  visitReturn(node: Return) {
    let type = node.term.visit(this);
    if (this.currentFunctionReturnType) {
      assertType(this.currentFunctionReturnType, type);
      return new VoidType();
    } else {
      throw Error("Encountered return statement outside any function");
    }
  }

  visitWhile(node: While) {
    node.conditional.visit(this);
    node.body.visit(this);
    return new VoidType();
  }

  visitAssign(node: Assign) {
    let variableType = this.locals.get(node.name);
    if (!variableType) {
      throw TypeError(`Assignment to an undefined variable ${node.name}`);
    }
    let valueType = node.value.visit(this);
    assertType(variableType, valueType);
    return new VoidType();
  }

  visitVar(node: Var) {
    let type = node.value.visit(this);
    this.locals.set(node.name, type);
    return new VoidType();
  }
}

export { TypeChecker }
