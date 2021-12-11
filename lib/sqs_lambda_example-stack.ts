import {Duration, Stack, StackProps} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { aws_sqs as sqs } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import {DeadLetterQueue} from "aws-cdk-lib/aws-sqs";

export class SqsLambdaExampleStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, 'Order', {
      partitionKey: {name: 'id', type: dynamodb.AttributeType.STRING},
      readCapacity: 1,
      writeCapacity: 1
    });

    const queue = new sqs.Queue(this, 'EventDLQ');

    const deadLetterQueue: DeadLetterQueue = {
      maxReceiveCount: 5,
      queue: queue,
    };

    const messageQueue = new sqs.Queue(this, 'EventQueue', {
      visibilityTimeout: Duration.seconds(60),
      deadLetterQueue: deadLetterQueue
    });

    const emitterLambda = new lambda.Function(this, 'EmitterLambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'sqs_lambda.emitter',
      environment: {
        LANGUAGE_TABLE_NAME: table.tableName,
        QUEUE_URL: messageQueue.queueUrl
      }
    });

    const receiverLambda = new lambda.Function(this, 'ReceiverLambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'sqs_lambda.receiver',
      environment: {
        LANGUAGE_TABLE_NAME: table.tableName
      }
    });
  }
}
