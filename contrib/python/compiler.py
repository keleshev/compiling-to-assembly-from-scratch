from __future__ import annotations
from typing import Protocol, Generic, TypeVar, Optional, Callable
from dataclasses import dataclass
from re import Pattern, compile as re
from abc import ABCMeta, abstractmethod


T = TypeVar('T')
U = TypeVar('U')

emit = print
test = lambda f: f()


class Error(Exception):
    """Compiler error"""


@dataclass
class ParseResult(Generic[T]):
    value: T
    source: Source


@dataclass
class Source:
    string: str
    index: int

    def match(self, regexp: Pattern) -> Optional[ParseResult[str]]:
        match = regexp.match(self.string, self.index)
        if match:
            value = match.group(0)
            source = Source(self.string, self.index + len(value))
            return ParseResult(value, source)
        return None


@test
def source_matching_is_idempotent():
    s = Source('  let', 2);
    result1 = s.match(re('let'))
    assert result1 != None and result1.value == 'let'
    assert result1 != None and result1.source.index == 5
    result2 = s.match(re('let'))
    assert result2 != None and result2.value == 'let'
    assert result2 != None and result2.source.index == 5


@dataclass
class Parser(Generic[T]):
    _parse: Callable[[Source], Optional[ParseResult[T]]]

    def parse(self, s: Source) -> Optional[ParseResult[T]]:
        return self.__dict__['_parse'](s)
    
    @staticmethod
    def regexp(regexp: Pattern) -> Parser[str]:
        return Parser(lambda source: source.match(regexp))

    @staticmethod
    def constant(value: U) -> Parser[U]:
        return Parser(lambda source: ParseResult(value, source))

    @staticmethod
    def error(message: str) -> Parser[U]:
        def error(source):
            raise Exception(message)
        return Parser(error)

    def or_(self, parser: Parser[T]) -> Parser[T]:
        def f(source: Source):
            result = self.parse(source)
            if result:
                return result 
            else:
                return parser.parse(source)
        return Parser(f)

    @staticmethod
    def zero_or_more(parser: Parser[U]) -> Parser[list[U]]:
        def f(source: Source):
            results: list[U] = []
            while (item := parser.parse(source)):
                source = item.source
                results.append(item.value)
            return ParseResult(results, source)
        return Parser(f)

    def bind(self, callback: Callable[[T], Parser[U]]) -> Parser[U]:
        def f(source: Source):
            result = self.parse(source)
            if result:
                return callback(result.value).parse(result.source)
            else:
                return None
        return Parser(f)

    # Non-primitive, composite combinators

    def and_(self, parser: Parser[U]) -> Parser[U]:
        return self.bind(lambda _: parser)

    def map(self, callback: Callable[[T], U]) -> Parser[U]:
        return self.bind(lambda value: 
                 Parser.constant(callback(value)))

    @staticmethod
    def maybe(parser: Parser[Optional[U]]) -> Parser[Optional[U]]:
        return parser.or_(Parser.constant(None))

    def parse_string_to_completion(self, string: str) -> T:
        source = Source(string, 0)

        result = self.parse(source)
        if not result:
            raise Error("Parse error: could not parse anything at all")

        index = result.source.index
        if index != len(result.source.string):
            raise Error(f"Parse error at index {index}")

        return result.value


regexp = Parser.regexp
constant = Parser.constant
maybe = Parser.maybe
zero_or_more = Parser.zero_or_more
error = Parser.error


@test
def parsing_alternatives():
    parser = regexp(re('bye')).or_(regexp(re('hai')))
    result = parser.parse_string_to_completion('hai')
    assert result == 'hai'

@test
def parsing_with_bindings():
    parser = regexp(re('[a-z]+')).bind(lambda word:
        regexp(re('[0-9]+')).bind(lambda digits:
            constant(f"first {word}, then {digits}")))
    result = parser.parse_string_to_completion('hai123')
    assert result == 'first hai, then 123'


whitespace = regexp(re(r'[ \n\r\t]+'))
comments = regexp(re('[/][/].*')).or_(regexp(re('(?s)[/][*].*[*][/]')))
ignored = zero_or_more(whitespace.or_(comments))

def token(pattern: Pattern) -> Parser[str]:
    return regexp(pattern).bind(lambda value:
        ignored.and_(constant(value)))

FUNCTION = token(re(r'function\b'))
IF = token(re(r'if\b'))
WHILE = token(re(r'while\b'))
ELSE = token(re(r'else\b'))
RETURN = token(re(r'return\b'))
VAR = token(re(r'var\b'))

COMMA = token(re('[,]'))
SEMICOLON = token(re(';'))
LEFT_PAREN = token(re('[(]'))
RIGHT_PAREN = token(re('[)]'))
LEFT_BRACE = token(re('[{]'))
RIGHT_BRACE = token(re('[}]'))

# INTEGER = token(re('[0-9]+')).map(lambda digits: Number










@dataclass
class Environment:
    locals: dict[str, int]
    next_local_offset: int




class AST(metaclass=ABCMeta):

    @abstractmethod
    def emit(self, env: Environment) -> None: pass

    # No need to define .equal() method like in TypeScript,
    # @dataclass annotation will derive .__eq__() for us,
    # so we can compare AST nodes with normal (==) operator.


@dataclass
class Main(AST):
    statements: list[AST]

    def emit(self, env: Environment):
        emit('.global main')
        emit('main:')
        emit('  push {fp, lr}')
        for statement in self.statements:
            statement.emit(env)
        emit('  mov r0, #0')
        emit('  pop {fp, pc}')


@dataclass
class Assert(AST):
    condition: AST

    def emit(self, env: Environment):
        self.condition.emit(env)
        emit('  cmp r0, #1')
        emit('  moveq r0, #"."')
        emit('  movne r0, #"F"')
        emit('  bl putchar')


@dataclass
class Number(AST):
    value: int

    def emit(self, env: Environment):
        emit(f'  ldr r0,={self.value}')


@dataclass
class Not(AST):
    term: AST

    def emit(self, env: Environment):
        self.term.emit(env)
        emit('  cmp r0, #0')
        emit('  moveq r0, #1')
        emit('  movne r0, #0')
























