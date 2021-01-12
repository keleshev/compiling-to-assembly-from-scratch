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

class Parser<T> {
  constructor(public parse: (s: Source) => (ParseResult<T> | null)) {}

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

  bind<U>(
    callback: (value: T) => Parser<U>,
  ): Parser<U> {
    return new Parser((source) => {
      let result = this.parse(source);
      if (result) {
        let value = result.value;
        let source = result.source;
        return callback(value).parse(source);
      } else {
        return null;
      }
    });
  }

  /* Non-primitive, composite combinators */

  and<U>(parser: Parser<U>): Parser<U> {
    return this.bind((_) => parser);
  }

  map<U>(callback: (t: T) => U): Parser<U> {
    return this.bind((value) => Parser.constant(callback(value)));
  }

  static maybe<U>(parser: Parser<U | null>): Parser<U | null> {
    return parser.or(Parser.constant(null));
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

export { ParseResult, Source, Parser }
