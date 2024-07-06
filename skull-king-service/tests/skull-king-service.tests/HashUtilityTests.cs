namespace skull_king_service.tests;

public class HashUtilityTests
{
  [Fact]
  public void CombinedHashCodesAreEqual()
  {
    var itemsOne = new List<string> { "Ryan", "Bob" };
    var itemsTwo = new List<string> { "Ryan", "Bob" };

    Assert.Equal(HashUtility.CombineHashCodes(itemsOne), HashUtility.CombineHashCodes(itemsTwo));
  }

  [Fact]
  public void CombinedHashCodesAreNotEqual()
  {
    var itemsOne = new List<string> { "Ryan", "Bob" };
    var itemsTwo = new List<string> { "Bob", "Ryan" };

    Assert.NotEqual(HashUtility.CombineHashCodes(itemsOne), HashUtility.CombineHashCodes(itemsTwo));
  }
}