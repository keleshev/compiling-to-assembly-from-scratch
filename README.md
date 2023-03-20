# Compiling to Assembly from Scratch

This repository contains source code from the book [Compiling to Assembly from Scratch](https://keleshev.com/cas), plus ports to other langauges (currently Python, OCaml, and Rust)

## Structure

* `part-1` folder contains the *baseline compiler* from *Part I* of the book.
* `part-2` folder contains the *extended compiler* from *Part II* of the book.
* `contrib` folder is for various other versions of the compiler. Contributions are welcome.



## Running the code

The book's compilers are wirtten in TypeScript, so you need to install the TypeScript compiler.
TypeScript compiles to JavaScript, so you need Node to run it in a non-browser environment (however, it works in browser too).


## On Rasperry Pi

Install Node and TypeScript:

    $ sudo apt-get install npm
    $ sudo npm install -g typescript


Now you've got everything necessary to run the compiler's test suite.
No emulation or cross-assembling necessary.


    $ make CC=gcc RUN=''


## On x86-64 Linux

> This assumes `apt-get` package manager.

Install TypeScript (and Node, as a dependency):

    $ sudo apt-get install npm
    $ sudo npm install -g typescript

Install GCC toolchain that targets 32-bit ARM:

    $ sudo apt-get install gcc-arm-linux-gnueabihf

Install QEMU emulator:

    $ sudo apt-get install qemu-user-static

Run baseline compiler's test suite:

    $ make CC='arm-linux-gnueabihf-gcc -static' RUN='qemu-arm-static'




<!-- TODO

## macOS on Intel

Insall [Homebrew package manager](https://brew.sh/).

Install TypeScript (and Node, as a dependency):

    $ brew install typescript

Install GCC toolchain that targets 32-bit ARM:

    $ brew cask instal gcc-arm-embedded
    $ brew install arm-linux-gnueabihf-binutils


-->


## In the browser

Minimal browser playground is available as well.

```bash
cd part-2
make ../docs/build.js
open ../docs/index.html
```

## Contribution

You are welcome to contribute your version of the book's compiler.
Make a pull request into the `contrib` directory.
