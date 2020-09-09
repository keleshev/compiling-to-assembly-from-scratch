import {
  AST, Main, Assert, Length, Integer, Bool, Not, Equal, NotEqual, Add,
  Subtract, Multiply, Divide, Call, ArrayNode, ArrayLookup, Exit, Block, If,
  FunctionDefinition, Id, Return, While, Assign, Var, Visitor,
} from "./ast";


let emit = console.log

class Label {
  static counter = 0;
  value: number;

  constructor() {
    this.value = Label.counter++;
  }

  toString() {
    return `.L${this.value}`;
  }
}

class CodeGenerator implements Visitor<void> {
  constructor(public locals: Map<string, number> = new Map(),
              public nextLocalOffset: number = 0) {}

  visitMain(node: Main) {
    emit(`.global main`);
    emit(`main:`);
    emit(`  push {fp, lr}`);
    node.statements.forEach((statement) =>
      statement.visit(this)
    );
    emit(`  mov r0, #0`);
    emit(`  pop {fp, pc}`);
  }

  visitAssert(node: Assert) {
    node.condition.visit(this);
    emit(`  cmp r0, #1`);
    emit(`  moveq r0, #'.'`);
    emit(`  movne r0, #'F'`);
    emit(`  bl putchar`);
  }

  visitLength(node: Length) {
    node.array.visit(this);
    emit(`  ldr r0, [r0, #0]`);
  }

  visitInteger(node: Integer) {
    emit(`  ldr r0, =${node.value}`);
  }

  visitBool(node: Bool) {
    new Integer(Number(node.value)).visit(this)
  }

  visitNot(node: Not) {
    node.term.visit(this);
    emit(`  cmp r0, #0`);
    emit(`  moveq r0, #1`);
    emit(`  movne r0, #0`);
  }

  visitEqual(node: Equal) {
    node.left.visit(this);
    emit(`  push {r0, ip}`);
    node.right.visit(this);
    emit(`  pop {r1, ip}`);
    emit(`  cmp r0, r1`);
    emit(`  moveq r0, #1`);
    emit(`  movne r0, #0`);
  }

  visitNotEqual(node: NotEqual) {
    node.left.visit(this);
    emit(`  push {r0, ip}`);
    node.right.visit(this);
    emit(`  pop {r1, ip}`);
    emit(`  cmp r0, r1`);
    emit(`  movne r0, #1`);
    emit(`  moveq r0, #0`);
  }

  visitAdd(node: Add) {
    node.left.visit(this);
    emit(`  push {r0, ip}`);
    node.right.visit(this);
    emit(`  pop {r1, ip}`);
    emit(`  add r0, r1, r0`);
  }

  visitSubtract(node: Subtract) {
    node.left.visit(this);
    emit(`  push {r0, ip}`);
    node.right.visit(this);
    emit(`  pop {r1, ip}`);
    emit(`  sub r0, r1, r0`);
  }

  visitMultiply(node: Multiply) {
    node.left.visit(this);
    emit(`  push {r0, ip}`);
    node.right.visit(this);
    emit(`  pop {r1, ip}`);
    emit(`  mul r0, r1, r0`);
  }

  visitDivide(node: Divide) {
    node.left.visit(this);
    emit(`  push {r0, ip}`);
    node.right.visit(this);
    emit(`  pop {r1, ip}`);
    emit(`  udiv r0, r1, r0`);
  }

  visitCall(node: Call) {
    let count = node.args.length;
    if (count === 0) {
      emit(`  bl ${node.callee}`);
    } else if (count === 1) {
      node.args[0].visit(this);
      emit(`  bl ${node.callee}`);
    } else if (count >= 2 && count <= 4) {
      emit(`  sub sp, sp, #16`);
      node.args.forEach((arg, i) => {
        arg.visit(this);
        emit(`  str r0, [sp, #${4 * i}]`);
      });
      emit(`  pop {r0, r1, r2, r3}`);
      emit(`  bl ${node.callee}`);
    } else {
      throw Error("More than 4 arguments are not supported");
    }
  }

  visitArrayNode(node: ArrayNode) {
    emit(`  push {r4, ip}`);
    emit(`  ldr r0, =${4 * (node.args.length + 1)}`);
    emit(`  bl malloc`);
    emit(`  mov r4, r0`);
    emit(`  ldr r0, =${node.args.length}`);
    emit(`  str r0, [r4]`);
    node.args.forEach((arg, i) => {
      arg.visit(this);
      emit(`  str r0, [r4, #${4 * (i + 1)}]`);
    });
    emit(`  mov r0, r4`);
    emit(`  pop {r4, ip}`);
  }

  visitArrayLookup(node: ArrayLookup) {
    node.array.visit(this);
    emit(`  push {r0, ip}`);
    node.index.visit(this);
    emit(`  pop {r1, ip}`);
    // r0 => index, r1 => array, r2 => array length
    emit(`  ldr r2, [r1], #4`);
    emit(`  cmp r0, r2`);
    emit(`  movhs r0, #0`);
    emit(`  ldrlo r0, [r1, +r0, lsl #2]`);
  }

  visitExit(node: Exit) {
    let syscallNumber = 1;
    emit(`  mov r0, #0`);
    emit(`  bl fflush`);
    node.term.visit(this);
    emit(`  mov r7, #${syscallNumber}`);
    emit(`  swi #0`);
  }

  visitBlock(node: Block) {
    node.statements.forEach((statement) =>
      statement.visit(this)
    );
  }

  visitIf(node: If) {
    let ifFalseLabel = new Label();
    let endIfLabel = new Label();
    node.conditional.visit(this);
    emit(`  cmp r0, #0`);
    emit(`  beq ${ifFalseLabel}`);
    node.consequence.visit(this);
    emit(`  b ${endIfLabel}`);
    emit(`${ifFalseLabel}:`);
    node.alternative.visit(this);
    emit(`${endIfLabel}:`);
  }

  visitFunctionDefinition(node: FunctionDefinition) {
    if (node.signature.parameters.size > 4) 
      throw Error("More than 4 params is not supported");

    emit(``);
    emit(`.global ${node.name}`);
    emit(`${node.name}:`);

    // Prologue
    emit(`  push {fp, lr}`);
    emit(`  mov fp, sp`);
    emit(`  push {r0, r1, r2, r3}`);

    let locals = new Map();
    let parameters = Array.from(node.signature.parameters.keys());
    parameters.forEach((parameter, i) => {
      locals.set(parameter, 4 * i - 16);
    });
    let visitor = new CodeGenerator(locals, -20);
    node.body.visit(visitor);

    // Epilogue
    emit(`  mov sp, fp`);
    emit(`  mov r0, #0`);
    emit(`  pop {fp, pc}`);
  }

  visitId(node: Id) {
    let offset = this.locals.get(node.value);
    if (offset) {
      emit(`  ldr r0, [fp, #${offset}]`);
    } else {
      console.log(this);
      throw Error(`Undefined variable: ${node.value}`);
    }
  }

  visitReturn(node: Return) {
    node.term.visit(this);
    emit(`  mov sp, fp`);
    emit(`  pop {fp, pc}`);
  }

  visitWhile(node: While) {
    let loopStart = new Label();
    let loopEnd = new Label();

    emit(`${loopStart}:`);
    node.conditional.visit(this);
    emit(`  cmp r0, #0`);
    emit(`  beq ${loopEnd}`);
    node.body.visit(this);
    emit(`  b ${loopStart}`);
    emit(`${loopEnd}:`);
  }

  visitAssign(node: Assign) {
    node.value.visit(this);
    let offset = this.locals.get(node.name);
    if (offset) {
      emit(`  str r0, [fp, #${offset}]`);
    } else {
      throw Error(`Undefined variable: ${node.name}`);
    }
  }

  visitVar(node: Var) {
    node.value.visit(this);
    emit(`  push {r0, ip}`);
    this.locals.set(node.name, this.nextLocalOffset - 4);
    this.nextLocalOffset -= 8;
  }
}

export { CodeGenerator }
