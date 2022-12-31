import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import {createNginxConfigMap} from "./configmap";

const config = new pulumi.Config();

const rmtpDefaultPort = 1935;
const containerHostName = 'multistream';

const labels = {
    app: 'multistream-rtmp',
};

const streamRtmpNamespace = new k8s.core.v1.Namespace('multi-stream-rtmp-namespace', {
    metadata: {
        name: 'multistream-rtmp',
    },
});

const streamRtmpConfig = createNginxConfigMap({
    namespace: streamRtmpNamespace,
    youtubeStreamKey: config.get('youtube-stream-key') || 'abcd',
    facebookStreamKey:  config.get('facebook-stream-key') || 'dcba',
    twitchStreamKey: config.get('twitch-stream-key') || 'acdb',
});

const streamRtmpServer = new k8s.apps.v1.Deployment('multi-stream-rtmp-server', {
    metadata: {
        name: 'multistream-rtmp-server',
        namespace: streamRtmpNamespace.metadata.name,
    },
    spec: {
        replicas: 1,
        selector: {
            matchLabels: labels,
        },
        template: {
            metadata: {
                labels: labels,
            },
            spec: {
                containers: [
                    {
                        name: 'nginx-rtmp-server',
                        image: 'thiagoeolima/nginx-rtmps:v1.2.0',
                        command: [
                            'bash',
                            '-c',
                            `set -e; stunnel4; exec nginx -g 'daemon off;'`,
                        ],
                        ports: [
                            {
                                name: 'stream',
                                containerPort: rmtpDefaultPort,
                            },
                        ],
                        volumeMounts: [
                            {
                                name: 'config',
                                mountPath: '/etc/nginx',
                            },
                        ],
                        env: [
                            {
                                name: 'NGINX_HOST',
                                value: containerHostName,
                            },
                        ],
                    },
                ],
                volumes: [
                    {
                        name: 'config',
                        configMap: {
                            name: streamRtmpConfig.metadata.name,
                        }
                    },
                ],
            },
        }
    },
}, {
    dependsOn: [
        streamRtmpConfig,
    ]
});

const rtmpService = new k8s.core.v1.Service('rmtp-service', {
    metadata: {
        name: 'rtmp',
        namespace: streamRtmpNamespace.metadata.name,
        labels: {
            'app.kubernetes.io/name': 'ingress-nginx',
        },
    },
    spec: {
        type: 'NodePort',
        selector: labels,

        ports: [
            {
                protocol: 'TCP',
                port: rmtpDefaultPort,
                targetPort: rmtpDefaultPort,
                name: 'stream',
                nodePort: rmtpDefaultPort,
            },
        ],
    },
}, {
    dependsOn: [
        streamRtmpNamespace,
        streamRtmpConfig,
        streamRtmpServer,
    ],
});
