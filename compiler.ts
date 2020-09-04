// vim: ft=javascript sw=2
let emit = console.log;
let test = (name: string, callback: () => void) => callback();

class ParseResult<T> {
  constructor(public value: T, public source: Source) {}
}

class Source {
  constructor(public string: string,
              public index: number) {}

  match(regexp: RegExp): (ParseResult<string> | null) {
    console.assert(regexp['sticky']);
    regexp.lastIndex = this.index;
    let match = this.string.match(regexp);
    //console.log('matching', regexp, 'at index', this.index,
    //            'gave', match && JSON.stringify(match[0]));
    if (match) {
      let value = match[0];
      let source = new Source(this.string, this.index + value.length);
      return new ParseResult(value, source); 
    }
    return null;
  }
}

test("Source matching is idempotent", () => {
  let s = new Source('  let', 2);
  let result1 = s.match(/let/y);
  console.assert(result1.value == 'let' && result1.source.index == 5);
  let result2 = s.match(/let/y);
  console.assert(result2.value == 'let' && result2.source.index == 5);
});


interface Parser<T> {
  parse(Source): ParseResult<T> | null;
}


class Parser<T> {
  constructor(public parse: (Source) => (ParseResult<T> | null)) {}

  /* Primitive combinators */

  static regexp(regexp: RegExp): Parser<string> {
    return new Parser(source => source.match(regexp));
  }

  static constant<U>(value: U): Parser<U> {
    return new Parser(source => new ParseResult(value, source));
  }

  static error<U>(message: string): Parser<U> {
    return new Parser(source => { throw Error(source.string.slice(source.index)) });
  }

  or(parser: Parser<T>): Parser<T> {
    return new Parser((source) => {
      let result = this.parse(source);
      if (result)
        return result;
      else
        return parser.parse(source);
    });
  }

  static zeroOrMore<U>(parser: Parser<U>): Parser<Array<U>> {
    return new Parser(source => {
      let results = [];
      let item;
      while (item = parser.parse(source)) {
        source = item.source;
        results.push(item.value);
      }
      return new ParseResult(results, source);
    });
  }

  bind<U>(callback: (T) => Parser<U>): Parser<U> {
    return new Parser((source) => {
      let result = this.parse(source);
      if (result)
        return callback(result.value).parse(result.source);
      else
        return null;
    });
  }

  /* Non-primitive, composite combinators */

  and<U>(parser: Parser<U>): Parser<U> {
    return this.bind((_) => parser);
  }

  map<U>(callback: (t: T) => U): Parser<U> {
    return this.bind((value) => constant(callback(value)));
  }

  static maybe<U>(parser: Parser<U>): Parser<U | null> {
    return parser.or(constant(null));
  }

  parseStringToCompletion(string: string): T {
    let source = new Source(string, 0);

    let result = this.parse(source);
    if (!result)
      throw Error("Parse error: could not parse anything at all");

    let index = result.source.index;
    if (index != result.source.string.length)
      throw Error("Parse error at index " + index);

    return result.value;
  }
}

let {regexp, constant, maybe, zeroOrMore, error} = Parser;

test("Parsing alternatives with `or`", () => {
  let parser = regexp(/bye/y).or(regexp(/hai/y));
  let result = parser.parseStringToCompletion('hai');
  console.assert(result == 'hai');
});

test("Parsing with bindings", () => {
  let parser = regexp(/[a-z]+/y).bind((word) =>
    regexp(/[0-9]+/y).bind((digits) =>
      constant(`first ${word}, then ${digits}`)));
  let result = parser.parseStringToCompletion('hai123');
  console.assert(result == 'first hai, then 123');
});

let whitespace = regexp(/[ \n\r\t]+/y);
let comments = regexp(/[/][/].*/y).or(regexp(/[/][*].*[*][/]/sy))
let ignored = zeroOrMore(whitespace.or(comments));

let token = (pattern) =>
  Parser.regexp(pattern).bind((value) =>
    ignored.and(constant(value)));

// Keywords
let FUNCTION = token(/function\b/y);
let IF = token(/if\b/y);
let WHILE = token(/while\b/y);
let ELSE = token(/else\b/y);
let RETURN = token(/return\b/y);
let VAR = token(/var\b/y);
let TRUE = token(/true\b/y).map((_) => new Bool(true));
let FALSE = token(/false\b/y).map((_) => new Bool(false));
let VOID = token(/void\b/y).map((_) => new VoidType());
let BOOLEAN = token(/boolean\b/y).map((_) => new BoolType());
let NUMBER = token(/number\b/y).map((_) => new IntegerType());
let ARRAY = token(/Array\b/y)

let COMMA = token(/[,]/y);
let SEMICOLON = token(/;/y);
let COLON = token(/[:]/y);
let LEFT_PAREN = token(/[(]/y);
let RIGHT_PAREN = token(/[)]/y);
let LEFT_BRACE = token(/[{]/y);
let RIGHT_BRACE = token(/[}]/y);
let LEFT_BRACKET = token(/\[/y);
let RIGHT_BRACKET = token(/\]/y);
let LESS_THAN = token(/</y);
let GREATER_THAN = token(/>/y);


let INTEGER =
  token(/[0-9]+/y).map((digits) =>
    new Integer(parseInt(digits)));

let BOOL: Parser<AST> = TRUE.or(FALSE)

let ID =
  token(/[a-zA-Z_][a-zA-Z0-9_]*/y);

let id = ID.map((x) => new Id(x));

// Operators
let NOT = token(/!/y).map((_) => Not);
let EQUAL = token(/==/y).map((_) => Equal);
let NOT_EQUAL = token(/!=/y).map((_) => NotEqual);
let PLUS = token(/[+]/y).map((_) => Add);
let MINUS = token(/[-]/y).map((_) => Subtract);
let STAR = token(/[*]/y).map((_) => Multiply);
let SLASH = token(/[\/]/y).map((_) => Divide);
let ASSIGN = token(/=/y).map((_) => Assign);


let expression: Parser<AST> = 
  Parser.error("expression parser used before definition");


// args <- (expression (COMMA expression)*)?
let args: Parser<Array<AST>> =
  expression.bind((arg) =>
    zeroOrMore(COMMA.and(expression)).bind((args) =>
      constant([arg, ...args]))).or(constant([]))

// call <- ID LEFT_PAREN args RIGHT_PAREN
let call: Parser<AST> =
  ID.bind((callee) =>
    LEFT_PAREN.and(args.bind((args) =>
      RIGHT_PAREN.and(constant(
        callee === '__assert' 
          ? new Assert(args[0])
	  : new Call(callee, args))))));

// array <- LEFT_BRACKET args RIGHT_BRACKET
let array: Parser<AST> = 
  LEFT_BRACKET.and(args.bind((args) =>
    RIGHT_BRACKET.and(constant(new ArrayNode(args)))))

// arrayLookup <- ID LEFT_BRACKET expression RIGHT_BRACKET
let arrayLookup: Parser<AST> = 
  id.bind((array) => 
    LEFT_BRACKET.and(expression.bind((index) =>
      RIGHT_BRACKET.and(constant(new ArrayLookup(array, index))))));

// atom <- BOOL / call / arrayLookup / ID / INTEGER / array / LEFT_PAREN expression RIGHT_PAREN
let atom: Parser<AST> =
  BOOL.or(call).or(arrayLookup).or(id).or(INTEGER).or(array).or(LEFT_PAREN.and(expression).bind((e) =>
    RIGHT_PAREN.and(constant(e))));

// unary <- NOT? atom
let unary: Parser<AST> =
  maybe(NOT).bind((not) =>
    atom.map((term) => not ? new Not(term) : term));

let infix = (operatorParser, termParser) =>
  termParser.bind((term) =>
    zeroOrMore(operatorParser.bind((operator) =>
      termParser.bind((term) => 
	constant({operator, term})))).map((operatorTerms) =>
          operatorTerms.reduce((left, {operator, term}) =>
            new operator(left, term), term)));

// product <- unary ((STAR / SLASH) unary)*
let product = infix(STAR.or(SLASH), unary);

// sum <- product ((PLUS / MINUS) product)*
let sum = infix(PLUS.or(MINUS), product);

// comparison <- sum ((EQUAL / NOT_EQUAL) sum)*
let comparison = infix(EQUAL.or(NOT_EQUAL), sum);

// expression <- comparison
expression.parse = comparison.parse;


let type: Parser<Type> =
  Parser.error("type parser used before definition");

// arrayType <- ARRAY LESS_THAN type GREATER_THAN
let arrayType: Parser<Type> =
  ARRAY.and(LESS_THAN).and(type).bind((elementType) =>
    GREATER_THAN.and(constant(new ArrayType(elementType))));

// atomType <- VOID | BOOLEAN | NUMBER | arrayType
let atomType: Parser<Type> =
  VOID.or(BOOLEAN).or(NUMBER).or(arrayType);

// type <- atomType
type.parse = atomType.parse


let statement: Parser<AST> =
  Parser.error("statement parser used before definition");

// returnStatement <- RETURN expression SEMICOLON
let returnStatement: Parser<AST> =
  RETURN.and(expression).bind((term) =>
    SEMICOLON.and(constant(new Return(term))));

// expressionStatement <- expression SEMICOLON
let expressionStatement: Parser<AST> =
  expression.bind((term) => SEMICOLON.and(constant(term)));

// ifStatement <-
//   IF LEFT_PAREN expression RIGHT_PAREN statement ELSE statement
let ifStatement: Parser<AST> =
  IF.and(LEFT_PAREN).and(expression).bind((conditional) =>
    RIGHT_PAREN.and(statement).bind((consequence) =>
      ELSE.and(statement).bind((alternative) =>
	constant(new If(conditional, consequence, alternative)))));

// whileStatement <-
//   WHILE LEFT_PAREN expression RIGHT_PAREN statement
let whileStatement: Parser<AST> =
  WHILE.and(LEFT_PAREN).and(expression).bind((conditional) =>
    RIGHT_PAREN.and(statement).bind((body) =>
      constant(new While(conditional, body))));

// varStatement <-
//   VAR ID ASSIGN expression SEMICOLON
let varStatement: Parser<AST> =
  VAR.and(ID).bind((name) =>
    ASSIGN.and(expression).bind((value) => 
      SEMICOLON.and(constant(new Var(name, value)))));

// assignmentStatement <- ID ASSIGN EXPRESSION SEMICOLON
let assignmentStatement: Parser<AST> =
  ID.bind((name) =>
    ASSIGN.and(expression).bind((value) => 
      SEMICOLON.and(constant(new Assign(name, value)))));

// blockStatement <- LEFT_BRACE statement* RIGHT_BRACE
let blockStatement: Parser<AST> =
  LEFT_BRACE.and(zeroOrMore(statement)).bind((statements) =>
    RIGHT_BRACE.and(constant(new Block(statements))));

// optionalTypeAnnotation <- (COLON type)?
let optionalTypeAnnotation: Parser<Type> =
  // If type annotation is missing, default to integer type 
  maybe(COLON.and(type)).map((type) =>
    type ? type : new IntegerType());  

// parameter <- ID optionalTypeAnnotation 
let parameter: Parser<[string, Type]> =
  ID.bind((parameter) =>
    optionalTypeAnnotation.bind((type) =>
      constant([parameter, type] as [string, Type])));

// parameters <- (parameter (COMMA parameter)*)?
let parameters: Parser<Array<[string, Type]>> =
  parameter.bind((param) =>
    zeroOrMore(COMMA.and(parameter)).bind((params) =>
      constant([param, ...params]))).or(constant([]))

// functionStatement <-
//   FUNCTION ID LEFT_PAREN parameters RIGHT_PAREN optionalTypeAnnotation blockStatement
let functionStatement: Parser<AST> =
  FUNCTION.and(ID).bind((name) =>
    LEFT_PAREN.and(parameters).bind((parameters) =>
      RIGHT_PAREN.and(optionalTypeAnnotation).bind((returnType) =>
        blockStatement.bind((block) =>
          constant(
            name === '__main'
              ? new Main(block.statements)
              : new FunctionDefinition(
                  name, 
                  new FunctionType(new Map(parameters), returnType),
                  block))))));
  

// statement <- returnStatement 
//            / ifStatement 
//            / whileStatement 
//            / varStatement 
//            / assignmentStatement 
//            / blockStatement
//            / functionStatement
//            / expressionStatement 
let statementParser: Parser<AST> =
  returnStatement
    .or(functionStatement)
    .or(ifStatement)
    .or(whileStatement)
    .or(varStatement)
    .or(assignmentStatement)
    .or(blockStatement)
    .or(expressionStatement);

statement.parse = statementParser.parse;

let parser: Parser<AST> =
  ignored.and(zeroOrMore(statement)).map((statements) =>
    new Block(statements));

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

interface Type {
  equals(Type): boolean;
  toString(): string;
}

class BoolType implements Type {

  equals(other: Type) {
    return other instanceof BoolType;
  }

  toString() {
    return "boolean";
  }
}

class IntegerType implements Type {

  equals(other: Type) {
    return other instanceof IntegerType;
  }

  toString() {
    return "number";
  }
}

class VoidType implements Type {

  equals(other: Type) {
    return other instanceof VoidType;
  }

  toString() {
    return "void";
  }
}

class ArrayType implements Type {
  constructor(public element: Type) {}

  equals(other: Type) {
    return other instanceof ArrayType &&
      this.element.equals(other.element);
  }

  toString() {
    return `Array<${this.element}>`;
  }
}

class FunctionType implements Type {
  constructor(public parameters: Map<string, Type>,
              public returnType: Type) {}

  equals(other: Type) {
    if (other instanceof FunctionType) {
      // Parameter names are irrelevant, compare only types
      let thisParameterTypes = Array.from(this.parameters.values());
      let otherParameterTypes = Array.from(other.parameters.values());
      return this.parameters.size === other.parameters.size &&
        thisParameterTypes.every((parameter, i) => parameter.equals(otherParameterTypes[i])) &&
        this.returnType.equals(other.returnType);
    } else {
      return false;
    }
  }

  toString() {
    let parameterStrings = Array.from(this.parameters).map(([name, type]) => `${name}: ${type}`);
    return `(${parameterStrings.join(', ')}) => ${this.returnType}`;
  } 
}

class TypeEnvironment {
  constructor(public locals: Map<string, Type> = new Map(),
              public functions: Map<string, FunctionType> = new Map(),
              public currentFunctionReturnType: Type | null = null) {}
}

class Environment {
  constructor(public locals: Map<string, number> = new Map(),
              public nextLocalOffset: number = 0) {}
}

function assertType(expected: Type, got: Type): void {
  if (!expected.equals(got)) {
    throw Error(`Type error: expected ${expected}, but got ${got}`);
  }
}

interface AST {
  emit(Environment): void; 
  equals(AST): boolean;
  visit<T>(v: Visitor<T>): T;
}

class Main implements AST {
  constructor(public statements: Array<AST>) {}

  visit<T>(v: Visitor<T>) { return v.visitMain(this); }

  emit(env: Environment) {
    emit(`.global main`);
    emit(`main:`);
    emit(`  push {fp, lr}`);
    this.statements.forEach((statement) =>
      statement.emit(env)
    );
    emit(`  mov r0, #0`);
    emit(`  pop {fp, pc}`);
  }

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

  emit(env: Environment) {
    this.condition.emit(env);
    emit(`  cmp r0, #1`);
    emit(`  moveq r0, #'.'`);
    emit(`  movne r0, #'F'`);
    emit(`  bl putchar`);
  }

  equals(other: AST) {
    return other instanceof Assert && 
      this.condition.equals(other.condition);
  }
}

class Integer implements AST {
  constructor(public value: number) {}

  visit<T>(v: Visitor<T>) { return v.visitInteger(this); }

  emit(env: Environment) {
    emit(`  ldr r0, =${this.value}`);
  }

  equals(other: AST) {
    return other instanceof Integer &&
      this.value === other.value;
  }
}

class Bool implements AST {
  constructor(public value: boolean) {}

  visit<T>(v: Visitor<T>) { return v.visitBool(this); }

  emit(env: Environment) {
    new Integer(Number(this.value)).emit(env)
  }

  equals(other: AST) {
    return other instanceof Bool &&
      this.value === other.value;
  }
}

class Not implements AST {
  constructor(public term: AST) {}

  visit<T>(v: Visitor<T>) { return v.visitNot(this); }

  emit(env: Environment) {
    this.term.emit(env);
    emit(`  cmp r0, #0`);
    emit(`  moveq r0, #1`);
    emit(`  movne r0, #0`);
  }

  equals(other: AST) {
    return other instanceof Not && this.term.equals(other.term);
  }
}

class Equal implements AST {
  constructor(public left: AST, public right: AST) {}

  visit<T>(v: Visitor<T>) { return v.visitEqual(this); }

  emit(env: Environment) {
    this.left.emit(env);
    emit(`  push {r0, ip}`);
    this.right.emit(env);
    emit(`  pop {r1, ip}`);
    emit(`  cmp r0, r1`);
    emit(`  moveq r0, #1`);
    emit(`  movne r0, #0`);
  }

  equals(other: AST) {
    return other instanceof Equal &&
      this.left.equals(other.left) &&
      this.right.equals(other.right);
  }
}

class NotEqual implements AST {
  constructor(public left: AST, public right: AST) {}

  visit<T>(v: Visitor<T>) { return v.visitNotEqual(this); }

  emit(env: Environment) {
    this.left.emit(env);
    emit(`  push {r0, ip}`);
    this.right.emit(env);
    emit(`  pop {r1, ip}`);
    emit(`  cmp r0, r1`);
    emit(`  movne r0, #1`);
    emit(`  moveq r0, #0`);
  }

  equals(other: AST) {
    return other instanceof NotEqual &&
      this.left.equals(other.left) &&
      this.right.equals(other.right);
  }
}

class Add implements AST {
  constructor(public left: AST, public right: AST) {}

  visit<T>(v: Visitor<T>) { return v.visitAdd(this); }

  emit(env: Environment) {
    this.left.emit(env);
    emit(`  push {r0, ip}`);
    this.right.emit(env);
    emit(`  pop {r1, ip}`);
    emit(`  add r0, r1, r0`);
  }

  equals(other: AST) {
    return other instanceof Add &&
      this.left.equals(other.left) &&
      this.right.equals(other.right);
  }
}

class Subtract implements AST {
  constructor(public left: AST, public right: AST) {}

  visit<T>(v: Visitor<T>) { return v.visitSubtract(this); }

  emit(env: Environment) {
    this.left.emit(env);
    emit(`  push {r0, ip}`);
    this.right.emit(env);
    emit(`  pop {r1, ip}`);
    emit(`  sub r0, r1, r0`);
  }

  equals(other: AST) {
    return other instanceof Subtract &&
      this.left.equals(other.left) &&
      this.right.equals(other.right);
  }
}

class Multiply implements AST {
  constructor(public left: AST, public right: AST) {}

  visit<T>(v: Visitor<T>) { return v.visitMultiply(this); }

  emit(env: Environment) {
    this.left.emit(env);
    emit(`  push {r0, ip}`);
    this.right.emit(env);
    emit(`  pop {r1, ip}`);
    emit(`  mul r0, r1, r0`);
  }

  equals(other: AST) {
    return other instanceof Multiply &&
      this.left.equals(other.left) &&
      this.right.equals(other.right);
  }
}

class Divide implements AST {
  constructor(public left: AST, public right: AST) {}

  visit<T>(v: Visitor<T>) { return v.visitDivide(this); }

  emit(env: Environment) {
    this.left.emit(env);
    emit(`  push {r0, ip}`);
    this.right.emit(env);
    emit(`  pop {r1, ip}`);
    emit(`  udiv r0, r1, r0`);
  }

  equals(other: AST) {
    return other instanceof Divide &&
      this.left.equals(other.left) &&
      this.right.equals(other.right);
  }
}

class Call implements AST {
  constructor(public callee: string, public args: Array<AST>) {}

  visit<T>(v: Visitor<T>) { return v.visitCall(this); }

  emit(env: Environment) {
    let count = this.args.length;
    if (count === 0) {
      emit(`  bl ${this.callee}`);
    } else if (count === 1) {
      this.args[0].emit(env);
      emit(`  bl ${this.callee}`);
    } else if (count >= 2 && count <= 4) {
      emit(`  sub sp, sp, #16`);
      this.args.forEach((arg, i) => {
        arg.emit(env);
        emit(`  str r0, [sp, #${4 * i}]`);
      });
      emit(`  pop {r0, r1, r2, r3}`);
      emit(`  bl ${this.callee}`);
    } else {
      throw Error("More than 4 arguments are not supported");
    }
  }

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

  emit(env: Environment) {
    emit(`  push {r4, ip}`);
    emit(`  ldr r0, =${4 * (this.args.length + 1)}`);
    emit(`  bl malloc`);
    emit(`  mov r4, r0`);
    emit(`  ldr r0, =${this.args.length}`);
    emit(`  str r0, [r4]`);
    this.args.forEach((arg, i) => {
      arg.emit(env);
      emit(`  str r0, [r4, #${4 * (i + 1)}]`);
    });
    emit(`  mov r0, r4`);
    emit(`  pop {r4, ip}`);
  }

  equals(other: AST) {
    return other instanceof ArrayNode &&
      this.args.length === other.args.length &&
      this.args.every((arg, i) => arg.equals(other.args[i]));
  }
}

class ArrayLookup implements AST {
  constructor(public array: AST, public index: AST) {}

  visit<T>(v: Visitor<T>) { return v.visitArrayLookup(this); }

  emit(env: Environment) {
    this.array.emit(env);
    emit(`  push {r0, ip}`);
    this.index.emit(env);
    emit(`  pop {r1, ip}`);
    // r0 => index, r1 => array, r2 => array length
    emit(`  ldr r2, [r1], #4`);
    emit(`  cmp r0, r2`);
    emit(`  movhs r0, #0`);
    emit(`  ldrlo r0, [r1, +r0, lsl #2]`);
  }

  equals(other: AST) {
    return other instanceof ArrayLookup && 
      this.array.equals(other.array) &&
      this.index.equals(other.index);
  }
}

class Exit implements AST {
  constructor(public term: AST) {}

  visit<T>(v: Visitor<T>) { return v.visitExit(this); }

  emit(env) {
    let syscallNumber = 1;
    emit(`  mov r0, #0`);
    emit(`  bl fflush`);
    this.term.emit(env);
    emit(`  mov r7, #${syscallNumber}`);
    emit(`  swi #0`);
  }

  equals(other: AST) {
    return other instanceof Exit && 
      this.term.equals(other.term);
  }
}

class Block implements AST {
  constructor(public statements: Array<AST>) {}

  visit<T>(v: Visitor<T>) { return v.visitBlock(this); }

  emit(env: Environment) {
    this.statements.forEach((statement) =>
      statement.emit(env)
    );
  }

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

  emit(env: Environment) {
    let ifFalseLabel = new Label();
    let endIfLabel = new Label();
    this.conditional.emit(env);
    emit(`  cmp r0, #0`);
    emit(`  beq ${ifFalseLabel}`);
    this.consequence.emit(env);
    emit(`  b ${endIfLabel}`);
    emit(`${ifFalseLabel}:`);
    this.alternative.emit(env);
    emit(`${endIfLabel}:`);
  }

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

  emit(_: Environment) {
    if (this.signature.parameters.size > 4) 
      throw Error("More than 4 params is not supported");

    emit(``);
    emit(`.global ${this.name}`);
    emit(`${this.name}:`);

    this.emitPrologue();
    let env = this.setUpEnvironment();
    this.body.emit(env);
    this.emitEpilogue();
  }

  emitPrologue() {
    emit(`  push {fp, lr}`);
    emit(`  mov fp, sp`);
    emit(`  push {r0, r1, r2, r3}`);
    // Alternatively:
    // emit(`  push {r0, r1, r2, r3, fp, lr}`);
    // emit(`  add fp, sp, #16`);
  }

  setUpEnvironment() {
    let env = new Environment();
    let parameters = Array.from(this.signature.parameters.keys());
    parameters.forEach((parameter, i) => {
      env.locals.set(parameter, 4 * i - 16);
    });
    env.nextLocalOffset = -20;
    return env;
  }

  emitEpilogue() {
    emit(`  mov sp, fp`);
    emit(`  mov r0, #0`);
    emit(`  pop {fp, pc}`);
  }

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

  emit(env: Environment) {
    let offset = env.locals.get(this.value);
    if (offset) {
      emit(`  ldr r0, [fp, #${offset}]`);
    } else {
      console.log(env);
      throw Error(`Undefined variable: ${this.value}`);
    }
  }

  equals(other: AST) {
    return other instanceof Id && 
      this.value === other.value;
  }
}

class Return implements AST {
  constructor(public term: AST) {}

  visit<T>(v: Visitor<T>) { return v.visitReturn(this); }

  emit(env) {
    this.term.emit(env);
    emit(`  mov sp, fp`);
    emit(`  pop {fp, pc}`);
  }

  equals(other: AST) {
    return other instanceof Return && 
      this.term.equals(other.term);
  }
}

class While implements AST {
  constructor(public conditional: AST, public body: AST) {}

  visit<T>(v: Visitor<T>) { return v.visitWhile(this); }

  emit(env: Environment) {
    let loopStart = new Label();
    let loopEnd = new Label();

    emit(`${loopStart}:`);
    this.conditional.emit(env);
    emit(`  cmp r0, #0`);
    emit(`  beq ${loopEnd}`);
    this.body.emit(env);
    emit(`  b ${loopStart}`);
    emit(`${loopEnd}:`);
  }

  equals(other: AST) {
    return other instanceof While &&
      this.conditional.equals(other.conditional) &&
      this.body.equals(other.body);
  }
}

class Assign implements AST {
  constructor(public name: string, public value: AST) {}

  visit<T>(v: Visitor<T>) { return v.visitAssign(this); }

  emit(env: Environment) {
    this.value.emit(env);
    let offset = env.locals.get(this.name);
    if (offset) {
      emit(`  str r0, [fp, #${offset}]`);
    } else {
      throw Error(`Undefined variable: ${this.name}`);
    }
  }

  equals(other: AST) {
    return other instanceof Assign &&
      this.name === other.name &&
      this.value.equals(other.value);
  }
}

class Var implements AST {
  constructor(public name: string, public value: AST) {}

  visit<T>(v: Visitor<T>) { return v.visitVar(this); }

  emit(env: Environment) {
    this.value.emit(env);
    emit(`  push {r0, ip}`);
    env.locals.set(this.name, env.nextLocalOffset - 4);
    env.nextLocalOffset -= 8;
  }

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

class TypeChecker implements Visitor<Type> {
  constructor(public locals: Map<string, Type> = new Map(),
              public functions: Map<string, FunctionType> = new Map(),
              public currentFunctionReturnType: Type | null = null) {}

  visitMain(node: Main) {
    node.statements.forEach((statement) => statement.visit(this));
    return new VoidType();
  }

  visitAssert(node: Assert) {
    assertType(new BoolType(), node.condition.visit(this));
    return new VoidType();
  }

  visitInteger(node: Integer) {
    return new IntegerType();
  }

  visitBool(node: Bool) {
    return new BoolType();
  }

  visitNot(node: Not) {
    assertType(new BoolType(), node.term.visit(this));
    return new BoolType();
  }

  visitEqual(node: Equal) {
    let leftType = node.left.visit(this);
    let rightType = node.right.visit(this);
    assertType(leftType, rightType);
    return new BoolType();
  }

  visitNotEqual(node: NotEqual) {
    let leftType = node.left.visit(this);
    let rightType = node.right.visit(this);
    assertType(leftType, rightType);
    return new BoolType();
  }

  visitAdd(node: Add) {
    assertType(new IntegerType(), node.left.visit(this));
    assertType(new IntegerType(), node.right.visit(this));
    return new IntegerType();
  }

  visitSubtract(node: Subtract) {
    assertType(new IntegerType(), node.left.visit(this));
    assertType(new IntegerType(), node.right.visit(this));
    return new IntegerType();
  }

  visitMultiply(node: Multiply) {
    assertType(new IntegerType(), node.left.visit(this));
    assertType(new IntegerType(), node.right.visit(this));
    return new IntegerType();
  }

  visitDivide(node: Divide) {
    assertType(new IntegerType(), node.left.visit(this));
    assertType(new IntegerType(), node.right.visit(this));
    return new IntegerType();
  }

  visitCall(node: Call) {
    let expected = this.functions.get(node.callee);
    if (!expected) {
      throw Error(`Type error: function ${node.callee} is not defined`); 
    }
    let argsTypes = new Map();
    node.args.forEach((arg, i) => argsTypes.set(`x${i}`, arg.visit(this)));
    let got = new FunctionType(argsTypes, expected.returnType);
    assertType(expected, got);
    return expected.returnType;
  }

  visitArrayNode(node: ArrayNode) {
    if (node.args.length == 0) {
      throw Error("Type error: can't infer type of an empty array");
    }
    let argsTypes = node.args.map((arg) => arg.visit(this));
    // Assert all arguments have the same type, pairwise
    let elementType = argsTypes.reduce((prev, next) => {
      assertType(prev, next);
      return prev;
    });
    return new ArrayType(elementType);
  }

  visitArrayLookup(node: ArrayLookup) {
    assertType(new IntegerType(), node.index.visit(this));
    let type = node.array.visit(this);
    if (type instanceof ArrayType) {
      return type.element;
    } else {
      throw Error(`Type error: expected an array, but got ${type}`);
    }
  }

  visitExit(node: Exit) {
    assertType(new IntegerType(), node.term.visit(this));
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

  visitFunctionDefinition(node: FunctionDefinition) {
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
      throw Error(`Type error: undefined variable ${node.value}`);
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
      throw Error(`Type error: assignment to an undefined variable ${node.name}`);
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

test("Expression parser", () => {
  console.log();
  let [x, y, z] = [new Id('x'), new Id('y'), new Id('z')];
  let parse = (string) => expression.parseStringToCompletion(string);

  console.assert(parse('x + y + z').equals(new Add(new Add(x, y), z)));
  console.assert(parse('x + y * z').equals(new Add(x, new Multiply(y, z))));
  console.assert(parse('x * y + z').equals(new Add(new Multiply(x, y), z)));
  console.assert(parse('(x + y) * z').equals(new Multiply(new Add(x, y), z)));
  console.assert(parse('x == y + z').equals(new Equal(x, new Add(y, z))));
  console.assert(parse('x + y == z').equals(new Equal(new Add(x, y), z)));

  console.assert(parse('f()').equals(new Call('f', [])));
  console.assert(parse('f(x)').equals(new Call('f', [x])));
  console.assert(parse('f(x, y, z)').equals(new Call('f', [x, y, z])));
});

test("Statement parser", () => {
  console.log();
  let [x, y, z] = [new Id('x'), new Id('y'), new Id('z')];
  let parse = (string) => statement.parseStringToCompletion(string);

  console.assert(parse('return x;').equals(new Return(x)));
  console.assert(parse('returnx;').equals(new Id('returnx')));
  console.assert(parse('x + y;').equals(new Add(x, y)));

  console.assert(parse('if (x) return y; else return z;').equals(
    new If(x, new Return(y), new Return(z))));

  console.assert(parse('{}').equals(new Block([])));
  console.assert(parse('{ x; y; }').equals(new Block([x, y])));

  console.assert(parse('if (x) { return y; } else { return z; }').equals(
    new If(x, new Block([new Return(y)]), new Block([new Return(z)]))));

  //console.assert(parse('function id(x) { return x; }').equals(
  //  new FunctionDefinition('id', ['x'], new Block([new Return(x)]))));
});

test("Parser integration test", () => {
  let source = `
    function factorial(n: number): number {
      var result = 1;
      while (n != 1) {
        result = result * n;
        n = n - 1;
      }
      return result;
    }
  `;

  let expected = new Block([
    new FunctionDefinition(
      "factorial", 
      new FunctionType(new Map([["n", new IntegerType()]]), new IntegerType()),
      new Block([
        new Var("result", new Integer(1)),
        new While(new NotEqual(new Id("n"), new Integer(1)), new Block([
          new Assign("result", new Multiply(new Id("result"), new Id("n"))),
          new Assign("n", new Subtract(new Id("n"), new Integer(1))),
        ])),
        new Return(new Id("result")),
      ]),
    ),
  ]);

  let result = parser.parseStringToCompletion(source);

  console.assert(result.equals(expected));
});

test("End-to-end test", () => {
  let source = `
    function assert(x: boolean): void {
      if (x) {
	putchar(46);
      } else {
	putchar(70);
      }
    }

    function return42(): number { return 42; }

    function returnNothing(): void {}

    function assert42(x: number): void {
      assert(x == 42);
    }

    function assert1234(a: number, b: number, c: number, d: number): void {
      assert(a == 1);
      assert(b == 2);
      assert(c == 3);
      assert(d == 4);
    }

    function factorial(n: number): number {
      if (n == 0) {
        return 1;
      } else {
        return n * factorial(n - 1);
      }
    }

    function factorial2(n: number): number {
      var result = 1;
      while (n != 1) {
        result = result * n;
	n = n - 1;
      }
      return result;
    }

    function main() {
      // Test boolean and negation
      assert(true);
      assert(!false);
      assert(!(!true));

      putchar(46);

      // Test Equal
      assert(42 == 42);
      assert(!(0 == 42));

      // Test NotEqual
      assert(!(42 != 42));
      assert(0 != 42);

      // Test infix operators
      assert(42 == 4 + 2 * (12 - 2) + 3 * (5 + 1));

      // Test Call with no parameters
      assert(return42() == 42);
      //assert(!returnNothing());

      // Test multiple parameters
      assert42(42);
      assert1234(1, 2, 3, 4);

      //assert(rand() != 42);
      //assert(putchar() != 1);

      //while (1) {
      //  assert(1);
      //}

      // Test If
      if (1)
	assert(true);
      else
	assert(false);

      if (0) {
        assert(false);
      } else {
        assert(true);
      }

      assert(factorial(5) == 120);

      var x = 4 + 2 * (12 - 2);
      var y = 3 * (5 + 1);
      var z = x + y;
      assert(z == 42);

      var a = 1;
      assert(a == 1);
      a = 0;
      assert(a == 0);

      // Test while loops
      var i = 0;
      while (i != 3) {
	i = i + 1;
      }
      assert(i == 3);

      assert(factorial2(5) == 120);

      // Test booleans
      assert(true);
      assert(!false);
      assert(true == true);
      assert(true != false);
      //assert(true == 1); // No type checking

      // Test array
      var a = [10, 20, 30]; 
      assert(a[0] == 10);
      assert(a[1] == 20);
      assert(a[2] == 30);
      assert(a[3] == 0); // Bounds checking
      assert(a[1000000000] == 0); // Bounds checking

      putchar(10); // Newline
    }

    function wrongReturnType1(): number {}
  `;

  let ast = parser.parseStringToCompletion(source);

  let typeChecker = new TypeChecker(
    new Map(),
    new Map([
      ["putchar", new FunctionType(new Map([["char", new IntegerType()]]), new VoidType())],
    ]),
  );
  ast.visit(typeChecker);

  ast.emit(new Environment());
});
