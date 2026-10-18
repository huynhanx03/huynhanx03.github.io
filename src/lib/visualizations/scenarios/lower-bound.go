package main

func LowerBound(a []int, target int) int {
    lo, hi := 0, len(a)
    for lo < hi {
        mid := lo + (hi-lo)/2
        if a[mid] < target {
            lo = mid + 1
        } else {
            hi = mid
        }
    }
    return lo
}
