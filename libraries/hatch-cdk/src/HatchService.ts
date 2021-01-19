// Peer dependencies
import * as cdk from '@aws-cdk/core';
import * as certificatemanager from '@aws-cdk/aws-certificatemanager';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as origins from '@aws-cdk/aws-cloudfront-origins';
import * as logs from '@aws-cdk/aws-logs';
import * as ecs from '@aws-cdk/aws-ecs';
import * as ecs_patterns from '@aws-cdk/aws-ecs-patterns';
import * as elb from '@aws-cdk/aws-elasticloadbalancingv2';

// Non-peer dependencies
import * as cognito from '@aws-cdk/aws-cognito';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecr_assets from '@aws-cdk/aws-ecr-assets';
import {
  ApplicationListener,
  ApplicationProtocol,
} from '@aws-cdk/aws-elasticloadbalancingv2';
import * as iam from '@aws-cdk/aws-iam';
import * as route53 from '@aws-cdk/aws-route53';
import * as route53targets from '@aws-cdk/aws-route53-targets';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3_assets from '@aws-cdk/aws-s3-assets';
import * as s3_deployment from '@aws-cdk/aws-s3-deployment';
import {Tags} from '@aws-cdk/core';
import {join} from 'path';

export interface HatchServiceDomainProps {
  domainName: string;
  /**
   * Assumed to be the same as domainName if not specified
   */
  zoneName?: string;
  publicHostedZoneId?: string;
  privateHostedZoneId?: string;
  /**
   * No domain name assigned by default
   */
  authDomainPrefix?: string;
  /**
   * Defaults to 'elb' if CloudFront is used with HTTPS. Must be covered by cert.
   */
  loadBalancerDomainPrefix?: string;
  /**
   * Unset by default. This or createCertificates is required for HTTPS.
   */
  regionCertificateArn?: string;
  /**
   * Unset by default. This or createCertificates is required for HTTPS.
   */
  cloudFrontDistributionCertificateArn?: string;
  /**
   * False by default
   */
  createCertificates?: boolean;
  /**
   * defaults to false
   */
  addWwwAlias?: boolean;
}

export interface HatchServiceContainerProps {
  directory: string;
  /**
   * Defaults to 'production-app-no-static'
   */
  appTarget?: string;
  /**
   * Must contain APP_NAME if using Dockerfile from hatch without appTarget set
   */
  buildArgs?: {[key: string]: string};
  environment?: {[key: string]: string};
  /**
   * Defaults to false if appTarget is set explicitly, otherwise true
   */
  hasStaticDeploymentBundle?: boolean;
}

export interface HatchServiceProps extends cdk.StackProps {
  containerOptions: HatchServiceContainerProps;
  /**
   * If not specified, only the randomly-assigned cloudfront.net URL will be available
   */
  domain?: HatchServiceDomainProps;
  /**
   * Defaults to 3 month retention, "destroy" removal policy
   */
  logGroupOptions?: logs.LogGroupProps;
  /**
   * Assumed to be the same as the log group name if not specified
   */
  logStreamPrefix?: string;
  /**
   * False by default
   */
  useCloudFront?: boolean;
  additionalCloudfrontBehaviors?: Record<string, cloudfront.BehaviorOptions>,
  fargateOptions?: ecs_patterns.ApplicationLoadBalancedFargateServiceProps;
  vpcId?: string;
  /**
   * e.g. for outward-facing LB
   */
  externalSecurityGroupIds?: string[];
  /**
   * e.g. for internal Fargate service
   */
  internalSecurityGroupIds?: string[];
  healthCheck?: elb.HealthCheck,
  /**
   * Defaults to VPC with 2 azs, container insights enabled
   */
  clusterProps?: ecs.ClusterProps;
  userPoolArn?: string;
  /**
   * defaults to false
   */
  createUserPool?: boolean;
  apiCachePolicy?: cloudfront.ICachePolicy;
  webAclId?: string;
  /**
   * True by default
   */
  pruneStaticAssets?: boolean;
}

const domainForPrefix = (prefix: string | undefined, parentDomain?: string) => {
  if (prefix == null || parentDomain == null) {
    return undefined;
  }
  return `${prefix.replace(/\.+$/, '')}.${parentDomain}`;
};

interface DomainInfo {
  domainName: string;
  elbDomain?: string;
  publicHostedZone?: route53.IHostedZone;
  privateHostedZone?: route53.IHostedZone;
  regionCertificate?: certificatemanager.ICertificate;
  distroCertificate?: certificatemanager.ICertificate;
}

const getDomainInfo = (
  stack: cdk.Stack,
  props: {domain?: HatchServiceDomainProps, useCloudFront?: boolean},
): DomainInfo | undefined => {
  if (props.domain != null) {
    const {publicHostedZoneId, privateHostedZoneId} = props.domain;
    const {domainName} = props.domain;
    const subjectAlternativeNames = [`*.${domainName}`];

    const publicHostedZone = publicHostedZoneId != null
      ? route53.HostedZone.fromHostedZoneAttributes(stack, 'publicDomainZone', {
        hostedZoneId: publicHostedZoneId,
        zoneName: props.domain.zoneName ?? domainName,
      }) : undefined;

    const privateHostedZone = privateHostedZoneId != null
      ? route53.HostedZone.fromHostedZoneAttributes(stack, 'privateDomainZone', {
        hostedZoneId: privateHostedZoneId,
        zoneName: props.domain.zoneName ?? domainName,
      }) : undefined;

    let regionCertificate: certificatemanager.ICertificate | undefined;
    if (props.domain.regionCertificateArn != null) {
      regionCertificate = certificatemanager.Certificate.fromCertificateArn(
        stack,
        'regionCertificate',
        props.domain.regionCertificateArn,
      );
    } else if (props.domain.createCertificates) {
      regionCertificate = new certificatemanager.Certificate(stack, 'regionCertificate', {
        domainName,
        subjectAlternativeNames,
        validation: certificatemanager.CertificateValidation.fromDns(publicHostedZone ?? privateHostedZone),
      });
    }

    let distroCertificate: certificatemanager.ICertificate | undefined;
    if (props.domain.cloudFrontDistributionCertificateArn != null) {
      distroCertificate = certificatemanager.Certificate.fromCertificateArn(
        stack,
        'distributionCertificate',
        props.domain.cloudFrontDistributionCertificateArn,
      );
    } else if (
      props.domain.createCertificates
      && props.useCloudFront
      && (publicHostedZone != null || privateHostedZone != null)
    ) {
      distroCertificate = new certificatemanager.DnsValidatedCertificate(stack, 'distributionCertificate', {
        domainName,
        subjectAlternativeNames,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked just a few lines up
        hostedZone: (publicHostedZone ?? privateHostedZone)!,
        region: 'us-east-1', // Must be us-east-1 for CloudFront
      });
    }

    let loadBalancerPrefix = props.domain.loadBalancerDomainPrefix;
    if (loadBalancerPrefix == null && regionCertificate != null) {
      loadBalancerPrefix = 'elb';
    }
    const elbDomain = (props.useCloudFront && distroCertificate != null)
      ? domainForPrefix(loadBalancerPrefix, props.domain.domainName)
      : props.domain.domainName;

    return {domainName, publicHostedZone, privateHostedZone, regionCertificate, distroCertificate, elbDomain};
  }
  return undefined;
};

interface UserManagementInfo {
  userPool: cognito.IUserPool;
  userPoolClient: cognito.UserPoolClient;
}

const getUserManagementInfo = (stack: cdk.Stack, domainInfo: DomainInfo | undefined, props: {
  userPoolArn?: string;
  createUserPool?: boolean, // defaults to false
  useCloudFront?: boolean, // False by default
}): UserManagementInfo | undefined => {
  if (props.userPoolArn != null || props.createUserPool) {
    if (domainInfo?.regionCertificate == null || (domainInfo?.distroCertificate == null || !props.useCloudFront)) {
      throw new Error('Service requiring a user pool needs to use HTTPS');
    }

    let userPool: cognito.IUserPool;
    if (props.userPoolArn != null) {
      userPool = cognito.UserPool.fromUserPoolArn(stack, 'userPool', props.userPoolArn);
    } else {
      userPool = new cognito.UserPool(stack, 'userPool', {
        selfSignUpEnabled: true,
        accountRecovery: cognito.AccountRecovery.EMAIL_AND_PHONE_WITHOUT_MFA,
        signInCaseSensitive: false,
        autoVerify: {
          email: true,
        },
        standardAttributes: {
          email: {required: true},
        },
      });
    }

    const userPoolClient = userPool.addClient('userPoolClient', {
      disableOAuth: true,
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
      },
      supportedIdentityProviders: [],
    });
    return {userPool, userPoolClient};
  }
  return undefined;
};

const configureCloudFront = (
  stack: cdk.Stack,
  domainInfo: DomainInfo | undefined,
  userManagementInfo: UserManagementInfo | undefined,
  loadBalancer: elb.IApplicationLoadBalancer,
  staticDeploymentOptions: StaticDeploymentOptions | undefined,
  props: {
    domain?: HatchServiceDomainProps,
    useCloudFront?: boolean,
    additionalCloudfrontBehaviors?: Record<string, cloudfront.BehaviorOptions>,
    apiCachePolicy?: cloudfront.ICachePolicy,
    webAclId?: string,
  },
): string | undefined => {
  let cloudFrontHost: string | undefined;
  if (props.useCloudFront) {
    let additionalBehaviors: Record<string, cloudfront.BehaviorOptions> = {
      ...props.additionalCloudfrontBehaviors,
    };
    if (staticDeploymentOptions != null) {
      const staticContentBehaviors: Record<string, cloudfront.BehaviorOptions> = {};
      const staticContentBehavior = {
        origin: new origins.S3Origin(staticDeploymentOptions.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      };

      staticDeploymentOptions.paths.forEach((path) => {
        staticContentBehaviors[path] = staticContentBehavior;
      });
      additionalBehaviors = {
        ...additionalBehaviors,
        ...staticContentBehaviors,
      };
    }

    let domainNames: string[] | undefined;
    // CloudFront domain is only allowed with a certificate to validate authorization to use domain
    if (domainInfo?.distroCertificate != null && domainInfo?.domainName != null) {
      domainNames = [domainInfo.domainName];
      const wwwDomain = domainForPrefix('www', domainInfo.domainName);
      if (props.domain?.addWwwAlias && wwwDomain != null) {
        domainNames.push(wwwDomain);
      }
    }

    const distribution = new cloudfront.Distribution(stack, 'cloudFrontDistribution', {
      defaultBehavior: {
        origin: new origins.HttpOrigin(domainInfo?.elbDomain ?? loadBalancer.loadBalancerDnsName, {
          protocolPolicy: domainInfo?.regionCertificate != null
            ? cloudfront.OriginProtocolPolicy.HTTPS_ONLY
            : cloudfront.OriginProtocolPolicy.HTTP_ONLY,
        }),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: props.apiCachePolicy ?? new cloudfront.CachePolicy(stack, 'apiCachePolicy', {
          cookieBehavior: cloudfront.CacheCookieBehavior.all(),
          headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
            'x-bypass-csrf-check',
            'x-pdf-test-metadata',
            'Authorization',
          ),
          queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      additionalBehaviors,
      certificate: domainInfo?.distroCertificate,
      domainNames,
      webAclId: props.webAclId,
    });

    if (domainInfo?.distroCertificate != null) {
      cloudFrontHost = domainInfo?.domainName;
    }
    if (cloudFrontHost == null) {
      cloudFrontHost = distribution.domainName;
    }

    if (domainInfo?.distroCertificate != null && domainInfo.publicHostedZone != null) {
      const cloudFrontTarget = route53.RecordTarget.fromAlias(new route53targets.CloudFrontTarget(distribution));
      const cloudFrontAlias = new route53.ARecord(stack, 'cloudFrontAlias', {
        zone: domainInfo.publicHostedZone,
        recordName: domainInfo.domainName,
        target: cloudFrontTarget,
      });
      if (domainNames != null && props.domain?.addWwwAlias) {
        new route53.ARecord(stack, 'cloudFrontWwwAlias', {
          zone: domainInfo.publicHostedZone,
          recordName: domainForPrefix('www', domainInfo.domainName),
          target: cloudFrontTarget,
        });
      }

      const authDomain = domainForPrefix(props.domain?.authDomainPrefix, props.domain?.domainName);
      if (authDomain != null && userManagementInfo != null && domainInfo.distroCertificate != null) {
        const userPoolDomain = userManagementInfo.userPool.addDomain('userPoolDomain', {
          customDomain: {
            domainName: authDomain,
            certificate: domainInfo.distroCertificate,
          },
        });

        userPoolDomain.node.addDependency(cloudFrontAlias);

        new route53.ARecord(stack, 'userPoolAlias', {
          zone: domainInfo.publicHostedZone,
          recordName: authDomain,
          target: route53.RecordTarget.fromAlias(new route53targets.UserPoolDomainTarget(userPoolDomain)),
        });
      }
    }
  }
  return cloudFrontHost;
};

type StaticDeploymentOptions = {paths: string[], bucket: s3.IBucket};

const configureStaticDeployment = (
  stack: cdk.Stack,
  props: {
    containerOptions: HatchServiceContainerProps,
    pruneStaticAssets?: boolean,
  },
  buildArgs?: {[key: string]: string},
): StaticDeploymentOptions | undefined => {
  let staticDeploymentOptions: StaticDeploymentOptions | undefined;
  if (props.containerOptions.appTarget == null || props.containerOptions.hasStaticDeploymentBundle) {
    const publicDirAsset = new s3_assets.Asset(stack, 'publicDirAsset', {
      // the `path` prop is not optional, but we don't actually need it, since we're copying all of
      // the content from the docker container that the app was built in
      path: join(__dirname, '.intentionally-empty-dir'),
      assetHashType: cdk.AssetHashType.OUTPUT, // Hash based on bundle output, not `path` contents
      bundling: {
        image: cdk.BundlingDockerImage.fromAsset(props.containerOptions.directory, {
          buildArgs,
        }),
        command: [
          'cp',
          '-R',
          '/app/build/public/static',
          '/app/build/public/favicon.ico',
          '/app/build/public/robots.txt',
          '/asset-output',
        ],
      },
    });

    const staticContentPaths = [
      '/static/*',
      '/favicon.ico',
      '/robots.txt',
    ];
    const staticContentBucket = new s3.Bucket(stack, 'staticContentBucket', {publicReadAccess: true});

    // Note: this will not delete the bucket on destroy / update.
    new s3_deployment.BucketDeployment(stack, 'staticContentDeployment', {
      sources: [s3_deployment.Source.bucket(publicDirAsset.bucket, publicDirAsset.s3ObjectKey)],
      destinationBucket: staticContentBucket,
      prune: (props?.pruneStaticAssets ?? true),
    });
    staticDeploymentOptions = {paths: staticContentPaths, bucket: staticContentBucket};
  }
  return staticDeploymentOptions;
};

type TaskRoleModifier = (taskRole: iam.IRole) => void;

export class HatchService extends cdk.Stack {
  public readonly publicUrl?: string;
  public readonly privateUrl?: string;
  public readonly taskRole: iam.IRole;

  private readonly loadBalancerListener: ApplicationListener;
  private readonly privateLoadBalancerListener?: ApplicationListener;

  constructor(scope: cdk.Construct, id: string, props: HatchServiceProps) {
    super(scope, id, props);
    Tags.of(this).add('hatchService', id);

    const taskRoleModifiers: TaskRoleModifier[] = [];
    const featureBasedEnvVars: {[key: string]: string} = {};
    const domainInfo = getDomainInfo(this, props);

    const userManagementInfo = getUserManagementInfo(this, domainInfo, props);
    if (userManagementInfo != null) {
      featureBasedEnvVars.AWS_USER_POOL_ID = userManagementInfo.userPool.userPoolId;
      featureBasedEnvVars.AWS_CLIENT_ID = userManagementInfo.userPoolClient.userPoolClientId;
      taskRoleModifiers.push((taskRole) => {
        taskRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonCognitoPowerUser'));
      });
    }

    let vpc: ec2.IVpc;
    if (props.vpcId != null) {
      vpc = ec2.Vpc.fromLookup(this, 'vpc', {vpcId: props.vpcId});
    } else {
      vpc = props.clusterProps?.vpc ?? new ec2.Vpc(this, 'vpc', {
        maxAzs: 2,
      });
    }

    const cluster = props.fargateOptions?.cluster ?? new ecs.Cluster(this, 'cluster', {
      containerInsights: true,
      vpc,
      ...props.clusterProps,
    });

    const {buildArgs} = props.containerOptions;
    const container = new ecr_assets.DockerImageAsset(this, 'container', {
      directory: props.containerOptions.directory,
      target: props.containerOptions.appTarget ?? 'production-app-no-static',
      buildArgs,
    });
    const staticDeploymentOptions = configureStaticDeployment(this, props, buildArgs);

    const externalSecurityGroupIds = props.externalSecurityGroupIds ?? [];
    const internalSecurityGroupIds = props.internalSecurityGroupIds ?? [];
    const externalSecurityGroups = externalSecurityGroupIds.map((secGroupId: string) => (
      ec2.SecurityGroup.fromSecurityGroupId(this, secGroupId, secGroupId, {
        mutable: false,
      })
    ));
    const internalSecurityGroups = internalSecurityGroupIds.map((secGroupId: string) => (
      ec2.SecurityGroup.fromSecurityGroupId(this, secGroupId, secGroupId, {
        mutable: false,
      })
    ));

    const publicLoadBalancer = props.fargateOptions?.publicLoadBalancer ?? true;
    if (props.useCloudFront && !publicLoadBalancer) {
      throw new Error('CloudFront can only be used with a public load balancer');
    }
    const loadBalancer = new elb.ApplicationLoadBalancer(this, 'loadBalancer', {
      vpc,
      internetFacing: publicLoadBalancer,
      securityGroup: internalSecurityGroups[0],
    });
    for (const securityGroup of internalSecurityGroups.slice(1)) {
      loadBalancer.addSecurityGroup(securityGroup);
    }
    for (const securityGroup of externalSecurityGroups) {
      loadBalancer.addSecurityGroup(securityGroup);
    }

    let taskRole: iam.IRole | undefined;
    if (taskRoleModifiers.length > 0) {
      taskRole = props.fargateOptions?.taskImageOptions?.taskRole ?? new iam.Role(this, 'taskRole', {
        assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      });
      for (const modifier of taskRoleModifiers) {
        modifier(taskRole);
      }
    }
    const defaultLogGroupName = `HatchService-${id}`;
    const logGroupProps: logs.LogGroupProps = {
      logGroupName: defaultLogGroupName,
      retention: logs.RetentionDays.THREE_MONTHS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      ...props.logGroupOptions,
    };
    const domainZone = publicLoadBalancer ? domainInfo?.publicHostedZone : domainInfo?.privateHostedZone;
    const fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'fargateService', {
      desiredCount: 2,
      // Above are overridable by props.fargateOptions
      ...props.fargateOptions,
      // Below are not overridable, except in places where props.fargateOptions is used
      cluster,
      taskImageOptions: {
        ...props.fargateOptions?.taskImageOptions,
        image: props.fargateOptions?.taskImageOptions?.image ?? ecs.ContainerImage.fromDockerImageAsset(container),
        environment: {
          /* eslint-disable @typescript-eslint/naming-convention -- using typical ENV_VAR naming convention */
          LOG_TO_CONSOLE: 'true',
          LOG_LEVEL: 'info',
          HOSTNAME: '0.0.0.0',
          ...props.containerOptions.environment,
          ...featureBasedEnvVars,
          AWS_REGION: cdk.Stack.of(this).region,
          ...props.fargateOptions?.taskImageOptions?.environment,
          /* eslint-enable @typescript-eslint/naming-convention */
        },
        taskRole,
        logDriver: props.fargateOptions?.taskImageOptions?.logDriver ?? new ecs.AwsLogDriver({
          streamPrefix: props.logStreamPrefix ?? logGroupProps.logGroupName ?? defaultLogGroupName,
          logGroup: new logs.LogGroup(this, 'logGroup', logGroupProps),
        }),
      },
      publicLoadBalancer,
      protocol: domainInfo?.regionCertificate != null ? elb.ApplicationProtocol.HTTPS : elb.ApplicationProtocol.HTTP,
      domainName: domainInfo?.elbDomain,
      domainZone,
      certificate: domainInfo?.regionCertificate,
      securityGroups: props.internalSecurityGroupIds != null ? internalSecurityGroups : undefined,
      loadBalancer,
      openListener: props.internalSecurityGroupIds != null ? false : undefined,
      assignPublicIp: publicLoadBalancer,
    });
    this.loadBalancerListener = fargateService.listener;
    this.taskRole = fargateService.taskDefinition.taskRole;

    if (
      domainInfo?.domainName != null
      && domainZone != null
      && domainInfo?.elbDomain === domainInfo?.domainName // i.e. no cloudfront
      && props.domain?.addWwwAlias
    ) {
      new route53.ARecord(this, 'elbWwwAlias', {
        zone: domainZone,
        recordName: domainForPrefix('www', domainInfo.domainName),
        target: route53.RecordTarget.fromAlias(new route53targets.LoadBalancerTarget(fargateService.loadBalancer)),
      });
    }

    const healthCheck: elb.HealthCheck = {
      path: '/api/health',
      ...props.healthCheck,
    };

    fargateService.targetGroup.configureHealthCheck(healthCheck);

    // If the main load balancer is public and we have custom security groups, set up a second LB for internal traffic
    if (publicLoadBalancer && props.internalSecurityGroupIds != null) {
      const privateLoadBalancer = new elb.ApplicationLoadBalancer(this, 'privateLoadBalancer', {
        vpc,
        securityGroup: internalSecurityGroups[0],
        vpcSubnets: {subnetType: ec2.SubnetType.PUBLIC},
        internetFacing: false,
      });
      for (const securityGroup of internalSecurityGroups.slice(1)) {
        privateLoadBalancer.addSecurityGroup(securityGroup);
      }
      const useHttps = domainInfo?.regionCertificate != null && domainInfo?.privateHostedZone != null;
      const listener = privateLoadBalancer.addListener('PrivateListener', {
        protocol: useHttps ? ApplicationProtocol.HTTPS : ApplicationProtocol.HTTP,
        open: true,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- proven non-null by useHttps definition
        certificates: useHttps ? [domainInfo!.regionCertificate!] : undefined,
      });
      this.privateLoadBalancerListener = listener;
      const targetGroup = listener.addTargets('fargatePrivateTarget', {port: 80});
      targetGroup.addTarget(fargateService.service);
      targetGroup.configureHealthCheck(healthCheck);
      if (domainInfo?.privateHostedZone != null) {
        new route53.ARecord(this, 'privateDomainName', {
          zone: domainInfo.privateHostedZone,
          recordName: domainInfo.domainName,
          target: route53.RecordTarget.fromAlias(new route53targets.LoadBalancerTarget(privateLoadBalancer)),
        });
      }
      if (useHttps) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- proven non-null by useHttps definition
        this.privateUrl = `https://${domainInfo!.domainName}`;
      } else if (domainInfo?.privateHostedZone != null) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- proven non-null by else-if check
        this.privateUrl = `http://${domainInfo!.domainName}`;
      } else {
        this.privateUrl = `http://${privateLoadBalancer.loadBalancerDnsName}`;
      }
    }

    const cloudFrontHost = configureCloudFront(
      this,
      domainInfo,
      userManagementInfo,
      fargateService.loadBalancer,
      staticDeploymentOptions,
      props,
    );

    if (staticDeploymentOptions != null) {
      // Allow access to static content via ELB redirects to static content
      const staticDomain = cloudFrontHost ?? staticDeploymentOptions.bucket.bucketRegionalDomainName;
      new elb.ApplicationListenerRule(this, 'staticListenerRule', {
        listener: fargateService.listener,
        priority: 1,
        pathPatterns: staticDeploymentOptions.paths,
        redirectResponse: {
          statusCode: 'HTTP_302',
          host: staticDomain,
          protocol: 'HTTPS',
          port: '443',
        },
      });
    }

    if (cloudFrontHost != null) {
      this.publicUrl = `https://${cloudFrontHost}`;
    } else {
      const elbHost = domainInfo?.elbDomain ?? fargateService.loadBalancer.loadBalancerDnsName;
      const url = domainInfo?.regionCertificate != null ? `https://${elbHost}` : `http://${elbHost}`;
      if (publicLoadBalancer) {
        this.publicUrl = url;
      } else {
        this.privateUrl = url;
      }
    }

    if (this.publicUrl != null) {
      new cdk.CfnOutput(this, 'publicUrl', {
        value: this.publicUrl,
      });
    }

    if (this.privateUrl != null) {
      new cdk.CfnOutput(this, 'privateUrl', {
        value: this.privateUrl,
      });
    }
  }

  public modifyLoadBalancerListeners(
    modifier: (listener: ApplicationListener, idPrefix: string, basePriority: number) => void,
  ) {
    modifier(this.loadBalancerListener, 'mainLB-', 2);
    if (this.privateLoadBalancerListener != null) {
      modifier(this.privateLoadBalancerListener, 'privateLB-', 2);
    }
  }
}
