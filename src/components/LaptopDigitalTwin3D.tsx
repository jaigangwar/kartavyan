import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface LaptopTwinProps {
  focusedApp: string;
  isVaultLocked: boolean;
  beamActive: boolean;
  laserPos: { x: number; y: number };
}

export const LaptopDigitalTwin3D: React.FC<LaptopTwinProps> = ({
  focusedApp,
  isVaultLocked,
  beamActive,
  laserPos,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({ focusedApp, isVaultLocked, beamActive, laserPos });

  useEffect(() => {
    stateRef.current = { focusedApp, isVaultLocked, beamActive, laserPos };
  }, [focusedApp, isVaultLocked, beamActive, laserPos]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 160;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 2.3, 4.6);
    camera.lookAt(0, 0.35, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e8, 2.2);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);

    const signalRimLight = new THREE.PointLight(0xff4f00, 3.5, 10);
    signalRimLight.position.set(-2.5, 1.5, -1.5);
    scene.add(signalRimLight);

    const laptopGroup = new THREE.Group();
    scene.add(laptopGroup);

    const baseGeo = new THREE.BoxGeometry(2.6, 0.1, 1.8);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a22,
      metalness: 0.85,
      roughness: 0.25,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    laptopGroup.add(baseMesh);

    const kbGeo = new THREE.PlaneGeometry(2.2, 1.0);
    const kbMat = new THREE.MeshStandardMaterial({
      color: 0x09090c,
      roughness: 0.6,
      metalness: 0.4,
    });
    const kbMesh = new THREE.Mesh(kbGeo, kbMat);
    kbMesh.rotation.x = -Math.PI / 2;
    kbMesh.position.set(0, 0.052, -0.15);
    laptopGroup.add(kbMesh);

    const tpGeo = new THREE.PlaneGeometry(0.75, 0.45);
    const tpMat = new THREE.MeshStandardMaterial({
      color: 0x14141b,
      metalness: 0.7,
      roughness: 0.3,
    });
    const tpMesh = new THREE.Mesh(tpGeo, tpMat);
    tpMesh.rotation.x = -Math.PI / 2;
    tpMesh.position.set(0, 0.052, 0.62);
    laptopGroup.add(tpMesh);

    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 0.05, -0.9);
    laptopGroup.add(lidPivot);

    const lidGeo = new THREE.BoxGeometry(2.6, 1.65, 0.07);
    const lidMesh = new THREE.Mesh(lidGeo, baseMat);
    lidMesh.position.set(0, 0.825, 0);
    lidPivot.add(lidMesh);

    const screenGeo = new THREE.PlaneGeometry(2.42, 1.48);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x111118 });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0, 0.825, 0.038);
    lidPivot.add(screenMesh);

    const laserDotGeo = new THREE.SphereGeometry(0.045, 16, 16);
    const laserDotMat = new THREE.MeshBasicMaterial({ color: 0xff4f00 });
    const laserDot = new THREE.Mesh(laserDotGeo, laserDotMat);
    laserDot.position.set(0, 0.825, 0.05);
    lidPivot.add(laserDot);

    const ringGeo = new THREE.TorusGeometry(0.35, 0.02, 16, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff4f00, transparent: true, opacity: 0 });
    const portalRing = new THREE.Mesh(ringGeo, ringMat);
    portalRing.position.set(0, 0.5, 1.1);
    laptopGroup.add(portalRing);

    let targetRotY = -0.32;
    let isDragging = false;
    let prevX = 0;

    const onDown = (clientX: number) => {
      isDragging = true;
      prevX = clientX;
    };
    const onMove = (clientX: number) => {
      if (!isDragging) return;
      const delta = (clientX - prevX) * 0.012;
      targetRotY += delta;
      prevX = clientX;
    };
    const onUp = () => {
      isDragging = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', (e) => onDown(e.clientX));
    window.addEventListener('mousemove', (e) => onMove(e.clientX));
    window.addEventListener('mouseup', onUp);
    dom.addEventListener('touchstart', (e) => onDown(e.touches[0].clientX), { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (e.touches[0]) onMove(e.touches[0].clientX);
    }, { passive: true });
    window.addEventListener('touchend', onUp);

    let frameId = 0;
    let clock = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      clock += 0.03;

      const { focusedApp: app, isVaultLocked: locked, beamActive: beam, laserPos: lPos } = stateRef.current;

      if (!isDragging) {
        targetRotY += Math.sin(clock * 0.4) * 0.0015;
      }
      laptopGroup.rotation.y += (targetRotY - laptopGroup.rotation.y) * 0.1;
      laptopGroup.position.y = Math.sin(clock * 0.8) * 0.04 - 0.35;

      const targetLidRot = locked ? 0.65 : -0.18;
      lidPivot.rotation.x += (targetLidRot - lidPivot.rotation.x) * 0.12;

      if (locked) {
        screenMat.color.setHex(0x3a0800);
      } else if (app === 'VS Code') {
        screenMat.color.setHex(0x0d1926);
      } else if (app === 'PowerPoint') {
        screenMat.color.setHex(0x2b1409);
      } else if (app === 'Spotify') {
        screenMat.color.setHex(0x092416);
      } else {
        screenMat.color.setHex(0x161622);
      }

      const normX = (lPos.x / 100 - 0.5) * 2.1;
      const normY = (0.5 - lPos.y / 100) * 1.25 + 0.825;
      laserDot.position.x += (normX - laserDot.position.x) * 0.25;
      laserDot.position.y += (normY - laserDot.position.y) * 0.25;

      if (beam) {
        ringMat.opacity = 0.9;
        portalRing.scale.setScalar(1 + Math.sin(clock * 6) * 0.25);
        portalRing.rotation.z += 0.15;
      } else {
        ringMat.opacity *= 0.9;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-36 select-none cursor-grab active:cursor-grabbing">
      <div ref={mountRef} className="w-full h-full" />
      <div className="absolute bottom-1.5 left-2.5 flex items-center gap-1.5 pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
        <span className="font-mono text-[10px] tracking-widest uppercase text-zinc-400">
          3D TWIN // DRAG TO ORBIT
        </span>
      </div>
    </div>
  );
};
