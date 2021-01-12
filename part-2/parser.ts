import { 
  Type, BooleanType, NumberType, VoidType, ArrayType, FunctionType,
} from "./types";

import {
  AST, Main, Assert, Length, Number, Boolean, Undefined, Not, Equal, NotEqual,
  Add, Subtract, Multiply, Divide, Call, ArrayLiteral, ArrayLookup, Exit, Block,
  If, Function, Id, Return, While, Assign, Var, Visitor,
} from "./ast";

import { ParseResult, Source, Parser } from "./parser-combinators"


let {regexp, constant, maybe, zeroOrMore, error} = Parser;

let whitespace = regexp(/[ \n\r\t]+/y);
let comments = regexp(/[/][/].*/y).or(regexp(/[/][*].*[*][/]/sy))
let ignored = zeroOrMore(whitespace.or(comments));

let token = (pattern: RegExp) =>
  Parser.regexp(pattern).bind((value) =>
    ignored.and(constant(value)));

// Keywords
let FUNCTION = token(/function\b/y);
let IF = token(/if\b/y);
let WHILE = token(/while\b/y);
let ELSE = token(/else\b/y);
let RETURN = token(/return\b/y);
let VAR = token(/var\b/y);
let TRUE = token(/true\b/y).map((_) => new Boolean(true));
let FALSE = token(/false\b/y).map((_) => new Boolean(false));
let UNDEFINED = token(/undefined\b/y).map((_) => new Undefined());
let VOID = token(/void\b/y).map((_) => new VoidType());
let BOOLEAN = token(/boolean\b/y).map((_) => new BooleanType());
let NUMBER = token(/number\b/y).map((_) => new NumberType());
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
    new Number(parseInt(digits)));

let boolean: Parser<AST> = TRUE.or(FALSE)

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
        callee === "length" 
          ? new Length(args[0])
	  : callee === "assert"
            ? new Assert(args[0])
            : new Call(callee, args))))));

// arrayLiteral <- LEFT_BRACKET args RIGHT_BRACKET
let arrayLiteral: Parser<AST> = 
  LEFT_BRACKET.and(args.bind((args) =>
    RIGHT_BRACKET.and(constant(new ArrayLiteral(args)))))

// arrayLookup <- ID LEFT_BRACKET expression RIGHT_BRACKET
let arrayLookup: Parser<AST> = 
  id.bind((array) => 
    LEFT_BRACKET.and(expression.bind((index) =>
      RIGHT_BRACKET.and(constant(new ArrayLookup(array, index))))));

// scalar <- boolean / UNDEFINED / ID / INTEGER

// atom <- 
//   boolean / UNDEFINED / call / arrayLookup / ID / INTEGER / arrayLiteral / LEFT_PAREN expression RIGHT_PAREN
let atom: Parser<AST> =
  boolean.or(UNDEFINED).or(call).or(arrayLookup).or(id).or(INTEGER).or(arrayLiteral).or(LEFT_PAREN.and(expression).bind((e) =>
    RIGHT_PAREN.and(constant(e))));

// unary <- NOT? atom
let unary: Parser<AST> =
  maybe(NOT).bind((not) =>
    atom.map((term) => not ? new Not(term) : term));

let infix = (operatorParser: Parser<new (left: AST, right: AST) => AST>, termParser: Parser<AST>) =>
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
let blockStatement: Parser<Block> =
  LEFT_BRACE.and(zeroOrMore(statement)).bind((statements) =>
    RIGHT_BRACE.and(constant(new Block(statements))));

// optionalTypeAnnotation <- (COLON type)?
let optionalTypeAnnotation: Parser<Type> =
  // If type annotation is missing, default to integer type 
  maybe(COLON.and(type)).map((type) =>
    type ? type : new NumberType());  

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
              : new Function(
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

export { statement, expression, parser }
