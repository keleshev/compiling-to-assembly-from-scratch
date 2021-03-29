OCaml ports
===========

Two ports are available:
* Prototype compiler that I wrote before settling on TypeScript, and
* Part I compiler ported closely to OCaml.

## Prototype compiler

I wrote the prototype compiler for the book in OCaml, before I decided to pick TypeScript.
It is incomplete, and structured a very differently, but multiple people showed interest.
Notably, it is missing a parser, and from AST it emits another intermediate representation that maps to ARM assembly, which is then pretty-printed.

To run it, install `ocaml` and run:

```sh
$ ocaml prototype-compiler.ml
```

And it will print assembly instructinos to the standard output channel, similar to the TypeScript version.


## Part I compiler port

This is an attempt to port the book's Part I compiler from TypeScript to OCaml that closely follows the original. 
It can be run as follows:

```sh
ocaml str.cma part-1-compiler.ml
```

It uses the `Str` regular expression library that is distributed with the OCaml compiler and doesn't need to be installed. The compiler also uses the new `let*` syntax, so you need to use a recent version of OCaml.
