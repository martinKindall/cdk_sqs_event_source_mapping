import {SQS, DynamoDB} from 'aws-sdk'

const sqs = new SQS({apiVersion: '2012-11-05'});
const dynamo = new DynamoDB.DocumentClient();

interface EventCreate {
    body: string;
}

interface Order {
    id: number;
    description: string;
    isProcessed: boolean;
}

interface EventSQS {
    Records: SQSRecord[]
}

interface SQSRecord {
    body: string,
    messageAttributes: MessageAttributes
}

interface MessageAttributes {
    OrderId: { stringValue: string };
    Description: { stringValue: string };
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

exports.receiver = async (event: EventSQS) => {
    console.log(event);
    const { Records: [firstRecord] } = event;
    const { messageAttributes: { Description, OrderId: {stringValue: orderId} } } = firstRecord;
    console.log(Description.stringValue);

    const dbQuery = {
        TableName: process.env.TABLE_NAME!,
        KeyConditionExpression: "#keyName = :orderId",
        ExpressionAttributeNames:{
            "#keyName": "id"
        },
        ExpressionAttributeValues: {
            ":orderId": orderId
        }
    };

    const queryResult = await dynamo.query(dbQuery).promise();
    const { Count = 0, Items } = queryResult;
    if (Count > 0) {
        const order: Order = Items?.[0] as Order;
        if (!order.isProcessed) {
            throw new Error("Order was not processed, trying later.");
        } else {
            console.log(`Order ${orderId} was processed.`);
        }
    }

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
