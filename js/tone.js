import * as THREE from 'three';

export class Tone {
  constructor(text, color, size, url, position) {
    this.text = text;
    this.color = color;
    this.size = size;
    this.url = url;
    this.position = position;
    this.sphere = this.createSphere();
    this.textSprite = this.createTextSprite();
  }

  createSphere() {
    const geometry = new THREE.SphereGeometry(this.size, 32, 16);
    const material = new THREE.MeshBasicMaterial({ color: this.color, transparent: true, opacity: 1 });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(this.position.x, this.position.y, this.position.z);
    sphere.userData = { url: this.url };
    return sphere;
  }

  createTextSprite() {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = '30px Arial';
    context.fillStyle = 'white';
    context.fillText(this.text, 0, 50);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.5, 0.25, 1);
    sprite.position.set(this.position.x, this.position.y - 0.2, this.position.z);
    return sprite;
  }
}
