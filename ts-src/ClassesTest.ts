export interface SayHello {
    helloWorld() : string;
}

export abstract class ClassTest implements SayHello {

    public foo(): void {
        console.log("Foo");
    }

    public helloWorld(): string {
        return "Hello this is ClassTest";
    }

    abstract bar() : number;
}

export class Patrick extends ClassTest {
    public helloWorld(): string {
        return "this is Patrick";
    }

    bar() : number {
        return 1;
    }
}

function paramTest(asdf : 'foo'|'bar'|'foobar') : number {
    return asdf == 'foo' ? 0 : (asdf == 'bar' ? 1 : 2 );
}

export class Spongebob extends ClassTest {
    bar() {
        return 11;
    }
}

interface Shape {
    getArea() : number;
}

interface Circle extends Shape {
    kind : 'circle';
    radius : number;
}
interface Sqare extends Shape {
    kind : 'square';
    sideLength : number;
}

type sCharacter = Spongebob | Patrick;
type sShape = Circle | Sqare;

let foobar : sCharacter;
foobar = new Patrick();


var foo = new Patrick();
let x = foo.helloWorld();

let bar = new Spongebob();
let y = bar.helloWorld();

console.log(`x: ${x} ;y: ${y}`);