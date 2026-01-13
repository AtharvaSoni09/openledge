import React from "react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t py-12 bg-zinc-50">
      <div className="container mx-auto px-4 text-center text-zinc-500 font-sans text-sm">
        &copy; {new Date().getFullYear()} The Daily Law. Created by Atharva Soni.
      </div>
    </footer>
  );
}
