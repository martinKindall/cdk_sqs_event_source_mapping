import {SQS} from 'aws-sdk'

const sqs = new SQS({apiVersion: '2012-11-05'});

interface EventCreate {
    body: string;
}

interface Order {
    id: number;
    description: string;
}

exports.emitter = async (event: EventCreate) => {
    console.log(event);
    const order: Order = JSON.parse(event.body);
    const { id, description } = order;

    const sqsMsg = {
        DelaySeconds: 10,
        MessageAttributes: {
            "OrderId": {
                DataType: "String",
                StringValue: id.toString()
            },
            "Description": {
                DataType: "String",
                StringValue: description
            }
        },
        MessageBody: "An order was created!",
        QueueUrl: process.env.QUEUE_URL!
    };

    await sqs.sendMessage(sqsMsg).promise();

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
