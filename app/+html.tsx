import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * This file is web-only and used to configure the root HTML for every
 * web page during static rendering.
 * The contents of this function only run in Node.js and only during
 * static rendering.
 */
export default function Root({ children }: PropsWithChildren) {
    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
                <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

                {/* SEO Tags */}
                <title>GFM Record Management System</title>
                <meta name="description" content="Official Student Record Management and GFM Portal for academic tracking, fee monitoring, and student activities." />
                <meta name="keywords" content="GFM, Student Records, Attendance, College Management" />

                {/* 
          Disable body scrolling on web. This makes ScrollView components work like 
          native scroll views. It's recommended for most app-like web experiences. 
        */}
                <ScrollViewStyleReset />

                {/* Add any additional head elements here, like fonts or scripts */}
                <style dangerouslySetInnerHTML={{
                    __html: `
          body { overflow: hidden; background-color: #F8FAFC; }
          #root { display: flex; flex: 1; height: 100vh; }
        ` }} />
            </head>
            <body>{children}</body>
        </html>
    );
}
