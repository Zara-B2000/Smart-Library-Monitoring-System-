function calculateOccupancy(count, is_librarian) {
  if (count === 0) {
    return is_librarian ? "Librarian Only" : "Empty";
  }
  if (is_librarian) {
    return "Librarian Present";
  }
  return "Occupied";
}

module.exports = { calculateOccupancy };
