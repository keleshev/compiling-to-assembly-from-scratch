OCaml prototype of the book's compiler
======================================

I wrote the prototype compiler for the book in OCaml, before I decided to pick TypeScript.
It is incomplete, and structured a bit differently, but multiple people showed interest.
Notably, it is missing a parser, and from AST it emits another intermediate representation that maps to ARM assembly, which is then pretty-printed.

At some point I will complete this compiler to be on par with the book, but right now my focus is on the book itself.

To run it, install `ocaml` and run:

```sh
$ ocaml compiler.ml
```

And it will print assembly instructinos to the standard output channel, similar to the TypeScript version.
