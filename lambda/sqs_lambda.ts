
interface EventCreate {
    body: string;
}

exports.emitter = async (event: EventCreate) => {
    console.log(event);
    return sendRes(200, "Order created!");
};

exports.receiver = async (event: any) => {
    console.log(event);
    return "Order Event received!";
};

const sendRes = (status:number, body:string) => {
    return {
        statusCode: status,
        headers: {
            "Content-Type": "text/html"
        },
        body: body
    };
};
