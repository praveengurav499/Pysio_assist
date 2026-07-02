import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Avatar3DProps {
  currentStage: 'neutral' | 'correct' | 'bending' | 'forward';
}

export default function Avatar3D({ currentStage }: Avatar3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f8fafc'); // Match clinical light slate background

    // 2. Camera setup
    const width = mountRef.current.clientWidth || 250;
    const height = mountRef.current.clientHeight || 250;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(2.8, 1.2, 0); // Side view looking at profile
    camera.lookAt(0, 0.5, 0);

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 8, 3);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 0.4); // Subtle blue fill light
    fillLight.position.set(-5, 3, -3);
    scene.add(fillLight);

    // 5. Grid helper for clinical touch
    const gridHelper = new THREE.GridHelper(4, 20, 0x3b82f6, 0xe2e8f0);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);

    // 6. Build simplified stick figure head and cervical neck spine
    const bodyGroup = new THREE.Group();
    scene.add(bodyGroup);

    // Shoulder Base / Collarbone
    const shoulderGeo = new THREE.BoxGeometry(0.1, 0.1, 1.2);
    const primaryMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1e293b, 
      roughness: 0.4,
      metalness: 0.1 
    });
    const shoulderMesh = new THREE.Mesh(shoulderGeo, primaryMaterial);
    shoulderMesh.position.set(0, -0.1, 0);
    bodyGroup.add(shoulderMesh);

    // Neck base node
    const jointGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const jointMaterial = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
    const spineBaseJoint = new THREE.Mesh(jointGeo, jointMaterial);
    spineBaseJoint.position.set(0, 0, 0);
    bodyGroup.add(spineBaseJoint);

    // Neck column
    const neckGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.6, 16);
    const activeMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3b82f6,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.1
    });
    const neckMesh = new THREE.Mesh(neckGeo, activeMaterial);
    // Center of cylinder pivot setup
    const neckPivot = new THREE.Group();
    neckPivot.position.set(0, 0, 0); // Base of neck
    neckMesh.position.y = 0.3; // extend upwards
    neckPivot.add(neckMesh);
    bodyGroup.add(neckPivot);

    // Head group (contains skull, jaw, nose, ears)
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.6, 0); // Tip of neck helper
    neckPivot.add(headPivot);

    // Skull
    const skullGeo = new THREE.SphereGeometry(0.32, 32, 32);
    const skullMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xe2e8f0, 
      roughness: 0.3 
    });
    const skullMesh = new THREE.Mesh(skullGeo, skullMaterial);
    headPivot.add(skullMesh);

    // Nose (facing left, towards -X direction)
    const noseGeo = new THREE.ConeGeometry(0.06, 0.18, 4);
    const noseMaterial = new THREE.MeshStandardMaterial({ color: 0xef4444 });
    const noseMesh = new THREE.Mesh(noseGeo, noseMaterial);
    noseMesh.rotation.z = Math.PI / 2; // Point forward towards -X
    noseMesh.position.set(-0.35, -0.05, 0);
    headPivot.add(noseMesh);

    // Left and Right Ears (for vertical postural alignment target)
    const earGeo = new THREE.SphereGeometry(0.06, 16, 16);
    const earMaterial = new THREE.MeshStandardMaterial({ color: 0x10b981 });
    const leftEar = new THREE.Mesh(earGeo, earMaterial);
    leftEar.position.set(0, 0, 0.34);
    const rightEar = leftEar.clone();
    rightEar.position.set(0, 0, -0.34);
    headPivot.add(leftEar);
    headPivot.add(rightEar);

    // Plumbline guide ring in the background (perfect vertical stack indicator)
    const idealRingGeo = new THREE.RingGeometry(0.38, 0.40, 32);
    const idealRingMat = new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide, transparent: true, opacity: 0.3 });
    const alignmentRing = new THREE.Mesh(idealRingGeo, idealRingMat);
    alignmentRing.rotation.y = Math.PI / 2;
    alignmentRing.position.set(0, 0.6, 0);
    scene.add(alignmentRing);

    // 7. Dynamic interpolation variables
    // These will smoothly interpolate towards target values for a beautiful dynamic feedback
    let targetNeckRotationZ = 0;
    let targetNeckPositionX = 0;
    let targetHeadRotationZ = 0;
    let targetColor = new THREE.Color('#3b82f6');
    let targetEmissive = new THREE.Color('#1d4ed8');

    // 8. Animation loop
    let isMounted = true;
    const animate = () => {
      if (!isMounted) return;

      // Determine correct biomechanic adjustments based on posture state
      switch (currentStage) {
        case 'correct':
          // Head slides backward smoothly, neck straightens and pulls back
          targetNeckRotationZ = -0.15; // slightly backward tilted
          targetNeckPositionX = 0.15; // retracted
          targetHeadRotationZ = -0.05; // gaze horizontal
          targetColor.set('#10b981'); // emerald
          targetEmissive.set('#065f46');
          break;
        case 'bending':
          // Head pivots forward and nods heavily downwards (flexion)
          targetNeckRotationZ = 0.2;
          targetNeckPositionX = -0.05;
          targetHeadRotationZ = 0.45; // forward tilting chin lock
          targetColor.set('#f43f5e'); // rose
          targetEmissive.set('#9f1239');
          break;
        case 'forward':
          // Extreme forward head lean without retraction
          targetNeckRotationZ = 0.4; // leaning forward
          targetNeckPositionX = -0.22; // slouched
          targetHeadRotationZ = -0.25; // raising chin to force gaze up
          targetColor.set('#f59e0b'); // amber
          targetEmissive.set('#78350f');
          break;
        case 'neutral':
        default:
          targetNeckRotationZ = 0;
          targetNeckPositionX = 0;
          targetHeadRotationZ = 0;
          targetColor.set('#3b82f6'); // sky blue
          targetEmissive.set('#1d4ed8');
          break;
      }

      // Smooth lerping
      neckPivot.rotation.z += (targetNeckRotationZ - neckPivot.rotation.z) * 0.1;
      neckPivot.position.x += (targetNeckPositionX - neckPivot.position.x) * 0.1;
      headPivot.rotation.z += (targetHeadRotationZ - headPivot.rotation.z) * 0.1;

      // Color animation
      if (Array.isArray(neckMesh.material)) {
        // Handle array of materials if any
      } else if (neckMesh.material) {
        const mat = neckMesh.material as THREE.MeshStandardMaterial;
        mat.color.lerp(targetColor, 0.1);
        mat.emissive?.lerp(targetEmissive, 0.1);
      }

      // Subtle breathing idle animation
      const breathe = Math.sin(Date.now() * 0.002) * 0.012;
      bodyGroup.position.y = breathe;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    animate();

    // 9. Resize logic
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Clean up
    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      // dispose geometries materials
      skullGeo.dispose();
      skullMaterial.dispose();
      noseGeo.dispose();
      noseMaterial.dispose();
      earGeo.dispose();
      earMaterial.dispose();
      neckGeo.dispose();
      activeMaterial.dispose();
      jointGeo.dispose();
      jointMaterial.dispose();
      idealRingGeo.dispose();
      idealRingMat.dispose();
      renderer.dispose();
    };
  }, [currentStage]);

  return (
    <div className="relative w-full h-full min-h-[170px] bg-slate-50 border border-blue-50 rounded-2xl overflow-hidden flex flex-col justify-between shadow-sm">
      <div className="absolute top-2 left-2.5 z-10">
        <span className="text-[8px] font-mono font-black tracking-widest text-slate-400 bg-white/80 border border-slate-100 px-2 py-0.5 rounded shadow-xs uppercase">
          3D Kinetic Spine Monitor
        </span>
      </div>

      {/* Render target mount container */}
      <div ref={mountRef} className="w-full h-full flex-1" style={{ minHeight: '135px' }} />

      <div className="bg-slate-100/90 border-t border-slate-200/40 p-1 px-3 text-center text-[9px] font-mono text-slate-500 flex justify-between items-center bg-white">
        <span>Gaze Horizon: 0°</span>
        <span className="font-bold flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${
            currentStage === 'correct' ? 'bg-emerald-500' : currentStage === 'bending' ? 'bg-rose-500' : 'bg-blue-400'
          }`} />
          Active Kinematic Sync
        </span>
      </div>
    </div>
  );
}
