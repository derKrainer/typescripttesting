function tryPromises(testVal : number) : Promise<any> {
    
    return new Promise<number>((resolve, reject) => {
        if(testVal % 2 == 0) {
            resolve(testVal);
        } else {
            reject(testVal);
        }
    });
}

/*const myProm = new Promise((resolve, reject) => {
    resolve("foo");
}); */

tryPromises(122)
    .then((res) => {
        console.log("res is: " + res);
        return tryPromises( res / 2 );
    })
    .then((res) => {
        console.log("res is now: " + res);
        return tryPromises( res / 2 );
    })
    .then((res)=>{
        console.log(`res is ${res} in the third step`);
        return tryPromises( res / 2 );
    })
    .catch((err) => {
        console.error('something bad happened: ' + err);
    });

console.log('Hello World!');