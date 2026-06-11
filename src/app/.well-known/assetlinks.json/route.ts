import { NextResponse } from 'next/server';

export async function GET() {
  const assetLinks = [
    {
      relation: [
        "delegate_permission/common.handle_all_urls"
      ],
      target: {
        namespace: "android_app",
        package_name: "com.playgrowthhub.app",
        sha256_cert_fingerprints: [
          "FC:3D:7C:2B:9F:45:E7:8A:B6:25:65:87:BD:CA:05:33:14:50:51:DE:A5:8A:BE:0F:AC:DC:5E:69:87:09:F6:FD"
        ]
      }
    }
  ];

  return new NextResponse(JSON.stringify(assetLinks), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  });
}
