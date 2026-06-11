import { NextResponse } from 'next/server'

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
          "00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00"
        ]
      }
    }
  ]

  return NextResponse.json(assetLinks, {
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
