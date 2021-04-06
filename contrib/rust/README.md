Rust Port
=========

> Contributed by Brendan "@brendanzab" Zabarauskas

The tests can be run as follows:

```sh
cargo test
```

To compile a sample program, run the following:

```sh
cargo run --bin part_1_compiler -- contrib/rust/sample.program
```

## Notes

This compiler diverges from the book in that it uses a PEG parser generator, and not the parser combinator approach described in the book.
