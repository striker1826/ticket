import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function QRPage() {
  return (
    <div className="qr-simple-page">
      <div className="qr-image-wrapper">
        <img
          src="/poster.jpg"
          alt="밴드 공연 안내 포스터"
          className="qr-poster-img"
        />
      </div>
    </div>
  );
}
