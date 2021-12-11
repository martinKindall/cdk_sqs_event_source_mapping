#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SqsLambdaExampleStack } from '../lib/sqs_lambda_example-stack';

const app = new cdk.App();
new SqsLambdaExampleStack(app, 'SqsLambdaExampleStack', {
});
