import {Duration, Stack, StackProps} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import {DeadLetterQueue, Queue} from "aws-cdk-lib/aws-sqs";
import * as apigatewayv2 from '@aws-cdk/aws-apigatewayv2-alpha';
import {HttpLambdaIntegration} from '@aws-cdk/aws-apigatewayv2-integrations-alpha'
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

export class SqsLambdaExampleStack extends Stack {
  private table: dynamodb.Table;
  private emitterLambda: lambda.Function;
  private receiverLambda: lambda.Function;
  private queue: Queue;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.createTable();
    this.createQueueAndDLQ();
    this.createLambdas();
    this.createHttpApi();
    this.createEventSourceMappingQueueReceiverLambda();
    this.setupPermissions();
  }

  private createTable() {
    this.table = new dynamodb.Table(this, 'Order', {
      partitionKey: {name: 'id', type: dynamodb.AttributeType.STRING},
      readCapacity: 1,
      writeCapacity: 1
    });
  }

  private createQueueAndDLQ() {
    const queue = new Queue(this, 'EventDLQ');
    const deadLetterQueue: DeadLetterQueue = {
      maxReceiveCount: 5,
      queue,
    };

    this.queue = new Queue(this, 'EventQueue', {
      visibilityTimeout: Duration.seconds(60),
      deadLetterQueue: deadLetterQueue
    });
  }

  private createLambdas() {
    this.emitterLambda = new lambda.Function(this, 'EmitterLambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'sqs_lambda.emitter',
      environment: {
        QUEUE_URL: this.queue.queueUrl
      }
    });
    this.receiverLambda = new lambda.Function(this, 'ReceiverLambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'sqs_lambda.receiver',
      environment: {
        TABLE_NAME: this.table.tableName
      }
    });
  }

  private createHttpApi() {
    const httpApi = new apigatewayv2.HttpApi(this, 'OrderApi');

    const createOrderIntegration = new HttpLambdaIntegration(
        'CreateOrderIntegration',
        this.emitterLambda
    );

    httpApi.addRoutes({
      path: '/order',
      methods: [ apigatewayv2.HttpMethod.POST ],
      integration: createOrderIntegration,
    });
  }

  private createEventSourceMappingQueueReceiverLambda() {
    const eventSource = new SqsEventSource(this.queue);
    this.receiverLambda.addEventSource(eventSource);
  }

  private setupPermissions() {
    this.queue.grantSendMessages(this.emitterLambda);
    this.queue.grantConsumeMessages(this.receiverLambda);
    this.table.grantReadData(this.receiverLambda);
  }
}
