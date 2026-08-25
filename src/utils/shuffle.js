/**
 * Xáo trộn một mảng sử dụng thuật toán Fisher-Yates (Knuth).
 * Hàm này sẽ thay đổi mảng gốc.
 * @param {Array} array Mảng cần xáo trộn.
 * @returns {Array} Mảng đã được xáo trộn.
 */
export function shuffleArray(array) {
  let currentIndex = array.length;
  let randomIndex;

  // Lặp qua các phần tử từ cuối về đầu
  while (currentIndex !== 0) {
    // Chọn một phần tử ngẫu nhiên còn lại
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // Hoán đổi nó với phần tử hiện tại
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }

  return array;
}